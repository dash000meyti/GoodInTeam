/**
 * The site guide engine, "virtual me" (spec §10.5). Vanilla TS, no React,
 * ≤6KB gz, imported lazily by GuideLoader after `load` + idle (or on an
 * explicit "What's this part?" / "Tour" while muted, `mode: "explicit"`).
 *
 * - One IntersectionObserver (activation band −35%/−50%), one rAF-debounced
 *   ResizeObserver on <main>; delegated pointerover/focusin on .os-desktop;
 *   Esc; visibilitychange. No scroll listener.
 * - Rect reads only on activation, resize or a tour step; writes go to CSS
 *   variables on #gt-guide (`--gx --gy --bx --by --sx --sy --sw --sh`),
 *   relative to .os-desktop. Placement maths: geometry.ts.
 * - Sprite frames: every state goes to `#gt-guide svg.px-sprite[data-state]`
 *   (pixel.css); #gt-guide itself carries no data-state.
 * - Never: role=dialog, aria-modal, aria-hidden on the bubble, a network
 *   request, a focus move outside the user-started tour.
 */
import {
  GUIDE_GREETED_KEY,
  GUIDE_IDLE_KEY,
  GUIDE_SEEN_KEY,
  readSessionFlag,
  writeGuidePref,
  writeSessionFlag,
} from "@/components/shell/guide-events";
import {
  CANDIDATES,
  bubbleB,
  centreDistance,
  frameColumn,
  inColumn,
  placeBubble,
  placeSprite,
  railProbe,
  tourScrollTop,
  type Box,
  type BubbleInput,
  type BubbleKind,
  type Frame,
  type Perch,
  type Placed,
} from "./geometry";

/** Engine sentinel (spec §10.4): written to `#gt-guide[data-engine]`; defined in this module only. */
export const GUIDE_ENGINE_ID = "gt-guide-engine@1";

export interface GuideLabels {
  name: string;
  hide: string;
  next: string;
  endTour: string;
  tourDone: string;
  idle: string;
  close: string;
}

export interface GuideOptions {
  root: HTMLElement;
  compact: boolean;
  mode: "auto" | "explicit";
  greeting: { full: string; compact: string };
  labels: GuideLabels;
}

export interface GuideApi {
  act(type: "explain" | "tour"): void;
  /** Mute: stop automatic mode, close everything, hide the layer. */
  stop(): void;
  compact(on: boolean): void;
  rescan(): void;
}

type Open = { el: Element; kind: BubbleKind; tour?: boolean; spot?: Element };

const WIPE = 560;
const doc = document;
const html = doc.documentElement;
const $ = <T extends Element>(s: string) => o.root.querySelector(s) as T;
/** A plain rect (DOMRect fields are prototype getters, so they don't survive a spread). */
const R = (e: Element): Box => {
  const { top, left, right, bottom } = e.getBoundingClientRect();
  return { top, left, right, bottom };
};
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const now = () => Date.now();
const rmq = matchMedia("(prefers-reduced-motion: reduce)");

let o: GuideOptions;
let root: HTMLElement;
let desk: HTMLElement;
let btn: HTMLButtonElement;
let svg: SVGElement;
let bub: HTMLElement;
let txt: HTMLElement;
let live: HTMLElement;
const acts: Record<string, HTMLButtonElement> = {};

let mode = "";
let small = false;
let ac: AbortController | null = null;
let io: IntersectionObserver | null = null;
let ro: ResizeObserver | null = null;
let band: Element[] = [];
let cand: Element | null = null;
let active: Element | null = null;
let first: Element | null = null;
let at: { x: number; y: number } | null = null;
let on: Element | null = null;
let open: Open | null = null;
let tour: { list: Element[]; i: number } | null = null;
let invoker: HTMLElement | null = null;
let after: (() => void) | null = null;
let hov: Element | null = null;
let chrome = { top: 0, dock: 0 };
let last = 0;
let lastSpot = 0;
let hideAt = 0;
let left = 0;
const tm: Record<string, ReturnType<typeof setTimeout>> = {};

const later = (k: string, ms: number, f: () => void) => {
  clearTimeout(tm[k]);
  tm[k] = setTimeout(f, ms);
};
const stopT = (...ks: string[]) => ks.forEach((k) => clearTimeout(tm[k]));
const flag = (n: string, on: boolean, el: Element = root) => el.toggleAttribute(n, on);
const data = (n: string, v: string) => root.setAttribute("data-" + n, v);
const css = (n: string, v: string | number) => root.style.setProperty("--" + n, String(v));
const reduced = () => rmq.matches || html.dataset.motion === "reduce";
const state = (s: string) => svg.setAttribute("data-state", s);
/** Restart the capped idle blink (5 iterations per activation, pixel.css). */
const blink = () => {
  svg.removeAttribute("data-state");
  void svg.getBoundingClientRect();
  state("idle");
};
const sayOf = (el: Element) => el.getAttribute("data-guide-say") || "";
/** Rendered: Next keeps up to 3 previous pages in the DOM, hidden by <Activity> (display:none). */
const shown = (el: Element) => el.isConnected && el.getClientRects().length > 0;
/** The rendered `[data-guide]` boxes in DOM order (`sel` narrows to `main` for the first box). */
const boxes = (sel = "[data-guide]") => Array.from(doc.querySelectorAll(sel)).filter(shown);

/* ── chrome values (registered px lengths, §10.5 "Chrome values") ── */
function readChrome() {
  const cs = getComputedStyle(html);
  let top = parseFloat(cs.getPropertyValue("--chrome-top"));
  let dock = parseFloat(cs.getPropertyValue("--dock-space"));
  if (!Number.isFinite(top))
    top = doc.querySelector(".os-menubar")?.getBoundingClientRect().bottom ?? 0;
  if (!Number.isFinite(dock)) {
    const d = doc.querySelector(".os-dock-list");
    dock = d ? innerHeight - d.getBoundingClientRect().top + 12 : 0;
  }
  const g = parseFloat(cs.getPropertyValue("--gutter"));
  const m = parseFloat(cs.getPropertyValue("--frame-max"));
  chrome = { top, dock };
  return { g: Number.isFinite(g) ? g : 16, m: Number.isFinite(m) ? m : 1200 };
}
let colVars = { g: 16, m: 1200 };
function frame(): Frame {
  const vw = html.clientWidth;
  return {
    vw,
    vh: innerHeight,
    chromeTop: chrome.top,
    dockSpace: chrome.dock,
    rtl: html.dir === "rtl",
    col: frameColumn(vw, colVars.g, colVars.m),
  };
}
const refresh = () => {
  colVars = readChrome();
};

/** The `.frame-cell` under a viewport point, ignoring the guide layer. */
const cellAt = (x: number, y: number) =>
  doc
    .elementsFromPoint(x, y)
    .find((e) => !root.contains(e))
    ?.closest(".frame-cell");

function perch(el: Element, f: Frame): [Box, Perch] {
  const r = inColumn(R(el), f);
  let p = placeSprite(r, f);
  if (p.kind === "rail") {
    const q = railProbe(r, f);
    if (cellAt(q.x, q.y)?.getAttribute("data-pad") === "none") p = placeSprite(r, f, true);
  }
  return [r, p];
}

/* ── movement (desktop) ── */
/**
 * Move the sprite to `el`'s perch: walk (same roof), arc hop (≤1.5
 * viewports), drop-in, or a fade (reduced motion). Returns ms to arrival.
 */
function goTo(el: Element, instant = false): number {
  if (small) return 0;
  on = el;
  const p = perch(el, frame())[1];
  stopT("mv", "land");
  if (p.kind === "none") {
    flag("data-gone", true);
    at = null;
    return 0;
  }
  const d = R(desk);
  const x = Math.round(p.x - d.left);
  const y = Math.round(p.y - d.top);
  const was = at;
  at = { x, y };
  data("perch", p.kind);
  const place = () => {
    css("gx", x + "px");
    css("gy", y + "px");
  };
  if (instant) {
    data("move", "");
    place();
    return 0;
  }
  const dx = was ? x - was.x : 0;
  const dy = was ? y - was.y : 0;
  const dist = Math.hypot(dx, dy);
  if (was && dist < 1) return 0;
  if (Math.abs(dx) > 2) data("face", dx < 0 ? "l" : "r");
  if (!was || reduced() || dist > 1.5 * innerHeight) {
    // Fade (first placement, reduced motion) or drop-in from −24px.
    const drop = !reduced();
    const out = was ? 120 : 0;
    data("move", "out");
    later("mv", out, () => {
      place();
      flag("data-gone", false);
      data("move", drop ? "drop" : "");
      later("land", drop ? 400 : 120, land);
    });
    return out + (drop ? 400 : 120);
  }
  const hop = Math.abs(dy) >= 8;
  const ms = Math.round(hop ? clamp(dist * 0.55, 450, 1000) : clamp(Math.abs(dx) * 0.9, 300, 900));
  css("gd", ms + "ms");
  if (hop) {
    css("tilt", (dx < 0 ? -8 : 8) + "deg");
    css("tdx", (-dx / dist).toFixed(2));
    css("tdy", (-dy / dist).toFixed(2));
  }
  requestAnimationFrame(() => {
    data("move", hop ? "hop" : "walk");
    if (!hop) state("walk");
    place();
  });
  later("land", ms, () => land(hop));
  return ms;
}

function land(squash = false) {
  data("move", "");
  if (squash) {
    flag("data-land", true);
    later("sq", 120, () => flag("data-land", false));
  }
  if (!open || svg.getAttribute("data-state") === "walk") blink();
}

/** Compact mode: the pinned sprite hops (its own translate, 2 × 180ms). */
function hop() {
  flag("data-hop", false, btn);
  void btn.offsetWidth;
  flag("data-hop", true, btn);
}

const badge = (on: boolean) => flag("data-badge", on);

/* ── the bubble ── */
function measure(text: string, kind: BubbleKind, t?: boolean) {
  bub.setAttribute("data-kind", kind === "explicit" ? (t ? "tour" : "explicit") : "auto");
  acts.next!.hidden = acts.end!.hidden = !t;
  txt.textContent = text;
  flag("data-measure", true, bub);
  bub.hidden = false;
  return { w: bub.offsetWidth, h: bub.offsetHeight };
}

/** Measure and place (desktop). Returns null when no allowed candidate fits. */
function place(
  el: Element,
  kind: BubbleKind,
  text: string,
  x: { tour?: boolean; spot?: Element },
): Placed | null {
  const { w, h } = measure(text, kind, x.tour);
  if (small) return { at: "C", left: 0, top: 0, tail: "down" };
  const f = frame();
  const target = x.spot ?? el;
  const [r, sprite] = x.spot ? [R(x.spot), { kind: "roof", x: 0, y: 0 } as Perch] : perch(el, f);
  const box = target.closest(".frame-box") ?? el;
  const i: BubbleInput = {
    kind,
    r,
    s: el.querySelector(":scope>.frame-strip") ? 36 : 0,
    sprite,
    bw: w,
    bh: h,
    f,
    headers: Array.from(box.querySelectorAll("[data-frame-header]"), R),
  };
  if (CANDIDATES[kind].includes("B") && sprite.kind !== "none") {
    const b = bubbleB(i);
    const c = cellAt(f.rtl ? b.left + 2 : b.right - 2, b.top + 2);
    i.decor = c?.hasAttribute("data-decor") ? R(c) : null;
  }
  const p = placeBubble(i);
  if (p) {
    const d = R(desk);
    css("bx", Math.round(p.left - d.left) + "px");
    css("by", Math.round(p.top - d.top) + "px");
  }
  return p;
}

function hideBubble() {
  stopT("hide", "type", "talk", "spotOut");
  hideAt = left = 0;
  bub.hidden = true;
  flag("data-open", false, bub);
  flag("data-measure", false, bub);
  flag("data-sel", false);
  btn.setAttribute("aria-expanded", "false");
  if (svg.getAttribute("data-state") === "talk") blink();
  open = null;
}

/**
 * Open a bubble on `el` (a `[data-guide]` box). Typing dots, then a stepped
 * wipe while the mouth talks; automatic kinds auto-hide (paused on hover/focus).
 */
function say(
  el: Element,
  kind: BubbleKind,
  text: string,
  x: { tour?: boolean; spot?: Element; hold?: number; typing?: number } = {},
): boolean {
  if (!text) return false;
  hideBubble();
  const p = place(el, kind, text, x);
  if (!p) {
    bub.hidden = true;
    flag("data-measure", false, bub);
    return false;
  }
  const explicit = kind === "explicit";
  open = { el, kind, tour: x.tour, spot: x.spot };
  bub.setAttribute("data-tail", p.tail ?? "");
  btn.setAttribute("aria-expanded", String(explicit));
  if (explicit) {
    live.lang = html.lang;
    live.textContent = text;
  }
  const typing = reduced() ? 0 : (x.typing ?? 400);
  bub.setAttribute("data-phase", typing ? "type" : "");
  requestAnimationFrame(() => {
    flag("data-measure", false, bub);
    flag("data-open", true, bub);
  });
  later("type", typing, () => {
    if (!typing) return;
    bub.setAttribute("data-phase", "wipe");
    state("talk");
    later("talk", WIPE, () => {
      bub.setAttribute("data-phase", "");
      blink();
    });
  });
  if (!explicit) hold(x.hold ?? clamp(text.length * 55, 4000, 9000) + typing + WIPE);
  last = now();
  return true;
}

function hold(ms: number) {
  hideAt = now() + ms;
  later("hide", ms, () => close());
}
function pause() {
  if (!hideAt) return;
  left = hideAt - now();
  hideAt = 0;
  stopT("hide");
}
function resume() {
  if (left && open) hold(Math.max(left, 1500));
  left = 0;
}

/** Close the bubble; Esc/× return focus to the invoker when focus was in the bubble or on the sprite. */
function close(back = false) {
  if (!open) return;
  const ae = doc.activeElement;
  const had = bub.contains(ae) || ae === btn;
  hideBubble();
  tour = null;
  live.textContent = "";
  if (back && had) (invoker?.isConnected && !root.contains(invoker) ? invoker : btn).focus();
  if (mode !== "auto") root.hidden = true;
  const f = after;
  after = null;
  f?.();
}

/** Move the sprite to `el`, then open an explicit bubble (sprite click, explain, tour steps). */
function speakAt(el: Element, text: string, t?: { list: Element[]; i: number }) {
  hideBubble();
  root.hidden = false;
  if (small) hop();
  const ms = small ? 0 : goTo(el);
  later("say", ms, () => {
    if (t && tour !== t) return;
    if (!say(el, "explicit", text, { tour: !!t })) return;
    if (t) acts.next!.focus();
    else if (mode === "auto") {
      markSeen(el);
      if (el === active) badge(false);
    }
  });
}

/* ── seen list (sessionStorage, `pathname#key`, written only in auto mode) ── */
const keyOf = (el: Element) => location.pathname + "#" + el.getAttribute("data-guide");
function seenList(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(GUIDE_SEEN_KEY) || "[]");
  } catch {
    return [];
  }
}
const seen = (el: Element) => seenList().includes(keyOf(el));
function markSeen(el: Element) {
  if (mode !== "auto" || seen(el)) return;
  try {
    sessionStorage.setItem(GUIDE_SEEN_KEY, JSON.stringify([...seenList(), keyOf(el)]));
  } catch {}
}

/* ── automatic mode ── */
function activate(el: Element) {
  if (mode !== "auto" || el !== cand || tour) return;
  if (
    open &&
    (open.kind === "explicit" || open.kind === "spot" || (open.kind === "greet" && open.el === el))
  ) {
    // Never over an explicit bubble or a hovered spot; the first box speaks after its greeting.
    if (open.kind === "greet") after = () => later("dw", 1200, () => activate(el));
    else later("dw", 1500, () => activate(el));
    return;
  }
  const fresh = el !== active;
  active = el;
  const unseen = !seen(el);
  if (small) {
    if (fresh) hop();
    badge(unseen);
    return;
  }
  if (open) {
    if (open.el === el) return;
    hideBubble();
  }
  const ms = goTo(el);
  if (!unseen) {
    badge(false);
    if (!ms) blink();
    return;
  }
  later("say", Math.max(ms, last + 2500 - now()), () => {
    if (el !== cand || open) return;
    const ok = say(el, el === first ? "first" : "auto", sayOf(el));
    badge(!ok);
    if (ok) markSeen(el);
  });
}

function greet() {
  if (scrollY >= 200 || readSessionFlag(GUIDE_GREETED_KEY)) return;
  const el = first ?? boxes()[0];
  if (!el) return;
  if (small) {
    // Compact: the one-time line says to tap the sprite when its "!" shows (4s of text).
    const hold = 4000 + (reduced() ? 0 : 400 + WIPE);
    if (say(el, "greet", o.greeting.compact, { hold })) writeSessionFlag(GUIDE_GREETED_KEY);
    return;
  }
  at = null;
  const g: Open = { el, kind: "greet" };
  open = g; // holds the first box's own line until the greeting has been said
  later("say", goTo(el), () => {
    if (mode !== "auto" || open !== g) return;
    open = null;
    state("wave");
    if (say(el, "greet", o.greeting.full, { typing: reduced() ? 0 : 960 })) {
      writeSessionFlag(GUIDE_GREETED_KEY);
      active = el;
    } else {
      blink();
      const f = after;
      after = null;
      f?.();
    }
  });
}

function input() {
  if (mode !== "auto") return;
  later("idle", 30_000, idleLine);
  later("sit", 60_000, () => !open && state("sit"));
  if (svg.getAttribute("data-state") === "sit") blink();
}
function idleLine() {
  if (small || open || tour || !active || readSessionFlag(GUIDE_IDLE_KEY)) return;
  if (say(active, "auto", o.labels.idle)) writeSessionFlag(GUIDE_IDLE_KEY);
}

/* ── spots: hover intent / keyboard focus, selection box, A only ── */
function spot(s: Element) {
  if (small || now() - lastSpot < 1200 || tour) return;
  if (open && open.kind !== "auto" && open.kind !== "first" && open.kind !== "spot") return;
  const host = s.closest("[data-guide]") ?? s;
  if (!say(host, "spot", sayOf(s), { spot: s })) return;
  lastSpot = now();
  const r = R(s);
  const d = R(desk);
  css("sx", Math.round(r.left - d.left) + "px");
  css("sy", Math.round(r.top - d.top) + "px");
  css("sw", Math.round(r.right - r.left) + "px");
  css("sh", Math.round(r.bottom - r.top) + "px");
  flag("data-sel", true);
}
const spotOut = () => later("spotOut", 1500, () => open?.kind === "spot" && close());

function observeAll() {
  doc.querySelectorAll("[data-guide]").forEach((e) => io?.observe(e));
  first = boxes("main [data-guide]")[0] ?? null;
}

/** Re-anchor after streams, images or a resize (rAF-debounced ResizeObserver). */
function reanchor() {
  refresh();
  observeAll();
  const el = on;
  if (small || !at || tour || root.getAttribute("data-move") || !el || !shown(el)) return;
  if (open?.kind === "spot") return;
  const p = perch(el, frame())[1];
  const d = R(desk);
  if (p.kind !== "none" && Math.abs(p.x - d.left - at.x) + Math.abs(p.y - d.top - at.y) < 2) return;
  goTo(el, true);
  if (open?.el === el && !bub.hidden) {
    const keep = open;
    if (place(el, keep.kind, txt.textContent || "", keep)) flag("data-measure", false, bub);
    else close();
  }
}

function boot() {
  if (mode === "auto") return;
  mode = "auto";
  close();
  root.hidden = false;
  ac = new AbortController();
  const sig = { signal: ac.signal, passive: true };
  io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        band = band.filter((b) => b !== e.target);
        if (e.isIntersecting) band.push(e.target);
      }
      const c = band[band.length - 1] ?? null;
      input();
      if (c !== cand) {
        cand = c;
        stopT("dw");
        if (c) later("dw", 600, () => activate(c));
      }
    },
    { rootMargin: "-35% 0px -50% 0px" },
  );
  let rq = 0;
  ro = new ResizeObserver(() => {
    cancelAnimationFrame(rq);
    rq = requestAnimationFrame(reanchor);
  });
  ro.observe(doc.querySelector("main") ?? desk);
  observeAll();
  desk.addEventListener(
    "pointerover",
    (e) => {
      input();
      if (small || e.pointerType === "touch") return;
      const s = (e.target as Element).closest("[data-guide-spot]");
      if (s === hov) return;
      hov = s;
      stopT("intent");
      if (s) {
        stopT("spotOut");
        later("intent", 350, () => hov === s && spot(s));
      } else if (open?.kind === "spot") spotOut();
    },
    sig,
  );
  desk.addEventListener(
    "focusin",
    (e) => {
      input();
      const t = e.target as Element;
      if (root.contains(t)) return;
      if (small) return flag("data-input", t.matches("input,textarea,select,[contenteditable]"));
      const s = t.closest("[data-guide-spot]");
      if (s && t.matches(":focus-visible")) spot(s);
      else if (open?.kind === "spot") spotOut();
    },
    sig,
  );
  desk.addEventListener("focusout", () => flag("data-input", false), sig);
  addEventListener("pointerdown", input, sig);
  addEventListener("keydown", input, sig);
  doc.addEventListener(
    "visibilitychange",
    () => (doc.hidden ? stopT("idle", "sit", "dw") : input()),
    sig,
  );
  at = null;
  flag("data-gone", !small);
  greet();
  input();
}

function halt() {
  mode = "explicit";
  ac?.abort();
  io?.disconnect();
  ro?.disconnect();
  ac = io = ro = null;
  for (const k in tm) clearTimeout(tm[k]);
  close();
  hideBubble();
  band = [];
  cand = active = hov = on = null;
  at = null;
  badge(false);
  flag("data-gone", !small);
  root.hidden = true;
}

/* ── explicit actions ── */
function nearest(): Element | null {
  const vh = innerHeight;
  let best: Element | null = null;
  let bd = Infinity;
  for (const e of boxes()) {
    const d = centreDistance(R(e), vh);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

function explain(toggle = false, from?: HTMLElement) {
  if (toggle && open?.kind === "explicit") return close(true);
  const el = (active && shown(active) && active) || nearest();
  if (!el) return;
  invoker = from ?? (doc.activeElement as HTMLElement | null);
  tour = null;
  speakAt(el, sayOf(el));
}

function runTour() {
  const list = boxes();
  if (!list.length) return;
  invoker = doc.activeElement as HTMLElement | null;
  hideBubble();
  tour = { list, i: 0 };
  step(0);
}

function step(i: number) {
  const t = tour;
  if (!t) return;
  t.i = i;
  const n = t.list.length;
  const done = i >= n;
  const el = t.list[Math.min(i, n - 1)]!;
  const text = done ? o.labels.tourDone : sayOf(el);
  const num = (v: number) => v.toLocaleString(html.lang);
  acts.next!.textContent = done
    ? o.labels.close
    : o.labels.next.replace("{i}", num(i + 1)).replace("{n}", num(n));
  acts.next!.dataset.done = done ? "1" : "";
  root.hidden = false;
  const bh = measure(text, "explicit", true).h;
  hideBubble();
  const go = () => tour === t && speakAt(el, text, t);
  if (done) return go();
  const behavior: ScrollBehavior = reduced() ? "auto" : "smooth";
  let target = scrollY;
  if (small) el.scrollIntoView({ block: "start", behavior });
  else {
    target = tourScrollTop(R(el).top + scrollY, chrome.top, bh);
    scrollTo({ top: target, behavior });
  }
  if (!small && Math.abs(target - scrollY) < 2) return go();
  let fired = false;
  const fin = () => {
    if (fired) return;
    fired = true;
    removeEventListener("scrollend", fin);
    go();
  };
  addEventListener("scrollend", fin, { once: true });
  later("tour", 900, fin);
}

/* ── one-time DOM wiring (both modes) ── */
function wire() {
  root = o.root;
  desk = (root.closest(".os-desktop") as HTMLElement) ?? root.parentElement!;
  btn = $(".gt-guide-sprite");
  svg = $("svg.px-sprite");
  bub = $("#gt-guide-bubble");
  txt = $(".gt-guide-text");
  live = $("#gt-guide-live");
  bub.querySelectorAll<HTMLButtonElement>("[data-act]").forEach((b) => (acts[b.dataset.act!] = b));
  btn.addEventListener("click", () => explain(true, btn));
  bub.addEventListener("click", (e) => {
    const a = (e.target as Element).closest("[data-act]")?.getAttribute("data-act");
    if (a === "next") {
      if (tour && !acts.next!.dataset.done) step(tour.i + 1);
      else close(true);
    } else if (a === "end" || a === "close") close(true);
    else if (a === "hide") {
      close(true);
      writeGuidePref(false);
    }
  });
  bub.addEventListener("pointerenter", pause);
  bub.addEventListener("pointerleave", () => !bub.contains(doc.activeElement) && resume());
  bub.addEventListener("focusin", pause);
  bub.addEventListener("focusout", (e) => {
    if (!bub.contains(e.relatedTarget as Node) && !bub.matches(":hover")) resume();
  });
  if (docWired) return;
  docWired = true;
  doc.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) close(true);
  });
  doc.addEventListener(
    "pointerdown",
    (e) => {
      if (small && open && !root.contains(e.target as Node)) close();
    },
    { passive: true },
  );
}
let docWired = false;

function setCompact(c: boolean) {
  small = c;
  flag("data-compact", c);
  refresh();
  if (open && !open.tour) close();
  flag("data-gone", !c);
  at = null;
  if (!c && active) activate(active);
}

const api: GuideApi = {
  act: (t) => (t === "tour" ? runTour() : explain()),
  stop: halt,
  compact: setCompact,
  rescan() {
    close();
    tour = null;
    band = [];
    cand = active = hov = on = null;
    badge(false);
    if (mode !== "auto") return void (root.hidden = true);
    io?.disconnect();
    observeAll();
    if (!small) {
      at = null;
      flag("data-gone", true);
    }
  },
};

/**
 * Start (or reconfigure) the guide. Idempotent; `mode` switches between
 * automatic and explicit-only. A new layer (the site layout mounted again
 * after a visit to the panel) is wired from scratch.
 */
export function start(opts: GuideOptions): GuideApi {
  const fresh = opts.root !== root;
  if (fresh && root) halt();
  o = opts;
  if (fresh) {
    mode = "";
    wire();
  }
  root.dataset.engine = GUIDE_ENGINE_ID;
  if (small !== opts.compact || fresh) setCompact(opts.compact);
  if (opts.mode === "auto") boot();
  else if (mode !== "explicit") halt();
  return api;
}
