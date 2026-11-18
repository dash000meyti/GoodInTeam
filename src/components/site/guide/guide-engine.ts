/**
 * GoodInBot, the site guide engine (spec §10.5; the anchor model of
 * 2026-11-18). Vanilla TS, no React, ≤6KB gz, imported lazily by GuideLoader
 * after `load` + idle (or on an explicit "What's this part?" / "Tour" while
 * muted, `mode: "explicit"`).
 *
 * - The bot never travels: it lives at one edge of the active box (geometry.ts
 *   anchors: top / bottom / chrome; compact: the dock) and emerges from behind
 *   it inside a clipping slot. Changing box = duck, reposition while hidden,
 *   emerge; the same anchor re-measured = reposition in place.
 * - The bubble opens beside the bot after it has emerged: thinking dots, then
 *   a typewriter (graphemes; the full text is laid out from the start, the rest
 *   visually hidden) while the sprite talks.
 * - One IntersectionObserver (activation band −35%/−50%), one rAF-debounced
 *   ResizeObserver on <main>; delegated pointerover/focusin on .os-desktop; Esc;
 *   visibilitychange. No scroll listener; rect reads only on activation, resize,
 *   a bubble or a tour step. Positions go to CSS variables on #gt-guide.
 * - Sprite frames: `#gt-guide svg.px-sprite[data-state]` (pixel.css).
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
  bubbleWidth,
  centreDistance,
  chooseAnchor,
  frameColumn,
  inColumn,
  placeBot,
  placeBubble,
  rises,
  tourScrollTop,
  type Anchor,
  type Bot,
  type Box,
  type Frame,
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

/** auto = a section line · greet · spot · explicit (bot click, explain, tour). */
type Kind = "auto" | "greet" | "spot" | "explicit";
type Open = { el: Element; kind: Kind; tour?: boolean; spot?: Element };

/* Timings (ms); reduced motion swaps every slide for a SWAP opacity fade. */
const EMERGE = 420;
const DUCK = 220;
const SWAP = 120;
const FADE = 140;
const THINK = 450;
const PER = 34;
const PAUSE = 160;

const doc = document;
const html = doc.documentElement;
const $ = <T extends Element>(s: string) => o.root.querySelector(s) as T;
/** A plain rect (DOMRect fields are prototype getters, so they don't survive a spread). */
const R = (e: Element): Box => {
  const { top, left, right, bottom } = e.getBoundingClientRect();
  return { top, left, right, bottom };
};
const now = () => Date.now();
const rmq = matchMedia("(prefers-reduced-motion: reduce)");

let o: GuideOptions;
let root: HTMLElement;
let desk: HTMLElement;
let btn: HTMLButtonElement;
let slot: HTMLElement;
let svg: SVGElement;
let bub: HTMLElement;
let typedEl: HTMLElement;
let restEl: HTMLElement;
let live: HTMLElement;
const acts: Record<string, HTMLButtonElement> = {};

let mode = "";
let small = false;
let ac: AbortController | null = null;
let io: IntersectionObserver | null = null;
let ro: ResizeObserver | null = null;
let so: IntersectionObserver | null = null;
let band: Element[] = [];
let cand: Element | null = null;
let active: Element | null = null;
let first: Element | null = null;
/** The box the bot is anchored to, where it is, and whether it is up (or on its way up). */
let on: Element | null = null;
let bot: Bot | null = null;
let up = false;
let open: Open | null = null;
let tour: { list: Element[]; i: number } | null = null;
let invoker: HTMLElement | null = null;
let after: (() => void) | null = null;
let hov: Element | null = null;
let chrome = { top: 0, dock: 0 };
let col = { g: 16, m: 1200 };
let last = 0;
let lastSpot = 0;
let holdMs = 0;
let hideAt = 0;
let held = false;
const tm: Record<string, ReturnType<typeof setTimeout>> = {};

const later = (k: string, ms: number, f: () => void) => {
  clearTimeout(tm[k]);
  tm[k] = setTimeout(f, ms);
};
const stopT = (...ks: string[]) => ks.forEach((k) => clearTimeout(tm[k]));
const flag = (n: string, on: boolean, el: Element = root) => el.toggleAttribute(n, on);
const data = (n: string, v: string) => root.setAttribute("data-" + n, v);
const css = (n: string, v: number) => root.style.setProperty("--" + n, Math.round(v) + "px");
const reduced = () => {
  const r = rmq.matches || html.dataset.motion === "reduce";
  flag("data-rm", r);
  return r;
};
/** Every state change restarts the capped blink (pixel.css; guide.css blinks once right away). */
const state = (s: string) => svg.setAttribute("data-state", s);
const sayOf = (el: Element) => el.getAttribute("data-guide-say") || "";
/** Rendered: Next keeps up to 3 previous pages in the DOM, hidden by <Activity> (display:none). */
const shown = (el: Element) => el.isConnected && el.getClientRects().length > 0;
/** The rendered `[data-guide]` boxes in DOM order (`sel` narrows to `main` for the first box). */
const boxes = (sel = "[data-guide]") => Array.from(doc.querySelectorAll(sel)).filter(shown);
const badge = (on: boolean) => flag("data-badge", on);

/* ── chrome values (registered px lengths, §10.5 "Chrome values") ── */
function refresh() {
  const cs = getComputedStyle(html);
  const v = (n: string) => parseFloat(cs.getPropertyValue(n));
  let top = v("--chrome-top");
  let dock = v("--dock-space");
  if (!Number.isFinite(top))
    top = doc.querySelector(".os-menubar")?.getBoundingClientRect().bottom ?? 0;
  if (!Number.isFinite(dock)) {
    const d = doc.querySelector(".os-dock-list");
    dock = d ? innerHeight - d.getBoundingClientRect().top + 12 : 0;
  }
  chrome = { top, dock };
  col = { g: v("--gutter") || 16, m: v("--frame-max") || 1200 };
}
const frame = (): Frame => ({
  vw: html.clientWidth,
  vh: innerHeight,
  chromeTop: chrome.top,
  dockSpace: chrome.dock,
  rtl: html.dir === "rtl",
});

/* ── the bot ── */
/** Where the bot goes for `el` (compact: the dock). `keep` re-measures an anchor already in use. */
function measure(el: Element | null, keep?: Anchor): Bot {
  const f = frame();
  if (small || !el) {
    const d = doc.querySelector(".os-dock-list");
    const r = d ? R(d) : { top: f.vh - f.dockSpace, left: 12, right: f.vw - 12, bottom: f.vh };
    return placeBot("dock", r.top, r, f.rtl, 32, 20);
  }
  const r = inColumn(R(el), frameColumn(f.vw, col.g, col.m));
  const a = keep ?? chooseAnchor(r, f);
  return placeBot(a, a === "top" ? r.top : a === "bottom" ? r.bottom : f.chromeTop, r, f.rtl);
}

const fixed = (b: Bot) => b.anchor === "chrome" || b.anchor === "dock";
/** Layer origin: `.os-desktop` for the box anchors (they scroll with it), the viewport for fixed ones. */
function origin(b: Bot) {
  if (fixed(b)) return { x: 0, y: 0 };
  const d = desk.getBoundingClientRect();
  return { x: d.left, y: d.top };
}

/** Put the slot (bot + 16px) with its clipping edge on the anchor line. */
function put(b: Bot) {
  bot = b;
  const p = origin(b);
  data("anchor", b.anchor);
  flag("data-fixed", fixed(b));
  css("gx", b.x - 8 - p.x);
  css("gy", (rises(b.anchor) ? b.line - b.size - 16 : b.line) - p.y);
}

/** Duck behind the line (hidden once the slide ends). */
function duck() {
  flag("data-rest", false);
  if (up) data("bot", "in");
  up = false;
}

/** Duck if up, reposition while hidden, emerge at `b`. Returns ms until it is up. */
function swap(b: Bot): number {
  stopT("mv", "rest");
  const rm = reduced();
  const d = up ? (rm ? SWAP : DUCK) : 0;
  duck();
  up = true;
  later("mv", d, () => {
    data("bot", "");
    put(b);
    // commit the hidden start (and restart the capped blink), then slide out
    const s = svg.getAttribute("data-state") || "idle";
    svg.removeAttribute("data-state");
    void btn.offsetWidth;
    state(s);
    data("bot", "out");
    later("rest", rm ? SWAP : EMERGE, () => flag("data-rest", true));
  });
  return d + (rm ? SWAP : EMERGE);
}

/** Anchor the bot at `el`: emerge (or swap) unless it is already up at the same anchor. */
function goTo(el: Element | null): number {
  const b = measure(el);
  const same = up && bot?.anchor === b.anchor && (small || on === el);
  on = el;
  if (same) {
    put(b);
    return 0;
  }
  return swap(b);
}

/* ── the bubble ── */
function placeBubbleNow() {
  if (!on && !small) return;
  const b = measure(on, small ? undefined : bot?.anchor);
  put(b);
  const f = frame();
  const w = bubbleWidth(b, f);
  css("bw", w.max);
  flag("data-measure", true, bub);
  bub.hidden = false;
  const p = placeBubble(b, bub.offsetWidth, bub.offsetHeight, w.beside, f);
  flag("data-measure", false, bub);
  const q = origin(b);
  css("bx", p.left - q.x);
  css("by", p.top - q.y);
  css("bt", p.t);
  bub.setAttribute("data-tail", p.tail);
}

function fill(text: string, kind: Kind, t?: boolean) {
  bub.setAttribute("data-kind", kind === "explicit" ? (t ? "tour" : "explicit") : "auto");
  acts.next!.hidden = acts.end!.hidden = !t;
  typedEl.textContent = "";
  restEl.textContent = text;
}

function hideBubble(fade = false) {
  stopT("hide", "type", "say", "spotOut", "out");
  holdMs = hideAt = 0;
  held = false;
  flag("data-sel", false);
  btn.setAttribute("aria-expanded", "false");
  if (svg.getAttribute("data-state") !== "sit") state("idle");
  bub.removeAttribute("data-phase");
  open = null;
  flag("data-open", false, bub);
  if (fade && !bub.hidden && !reduced()) {
    flag("data-out", true, bub);
    later("out", FADE, () => (bub.hidden = true));
  } else bub.hidden = true;
}

/** Graphemes (Persian clusters, emoji) with a code-point fallback. */
function graphemes(t: string): string[] {
  try {
    return Array.from(
      new Intl.Segmenter(html.lang, { granularity: "grapheme" }).segment(t),
      (s) => s.segment,
    );
  } catch {
    return Array.from(t);
  }
}

/**
 * Open a bubble on `el` (a `[data-guide]` box) once the bot is up there:
 * grow in from the tail, think, then type while the mouth talks. Automatic
 * kinds hold for max(4.5s, 0.38s per word) after typing, paused on hover/focus.
 */
function say(
  el: Element,
  kind: Kind,
  text: string,
  x: { tour?: boolean; spot?: Element; think?: number } = {},
) {
  if (!text) return;
  hideBubble(true);
  const me: Open = { el, kind, tour: x.tour, spot: x.spot };
  const explicit = kind === "explicit";
  open = me;
  btn.setAttribute("aria-expanded", String(explicit));
  if (explicit) {
    live.lang = html.lang;
    live.textContent = text;
  }
  last = now();
  later("say", goTo(el), () => {
    if (open !== me) return;
    stopT("out");
    flag("data-out", false, bub);
    fill(text, kind, x.tour);
    placeBubbleNow();
    flag("data-open", true, bub);
    if (x.tour) acts.next!.focus();
    const done = () => {
      bub.removeAttribute("data-phase");
      state("idle");
      typedEl.textContent = text;
      restEl.textContent = "";
      if (!explicit) {
        holdMs = Math.max(4500, text.split(/\s+/).length * 380);
        arm();
      }
    };
    if (reduced()) return done();
    if (kind === "greet") state("wave");
    bub.setAttribute("data-phase", "think");
    const g = graphemes(text);
    let i = 0;
    let n = 0;
    const tick = () => {
      if (open !== me) return;
      if (i >= g.length) return done();
      const c = g[i++]!;
      n += c.length;
      typedEl.textContent = text.slice(0, n);
      restEl.textContent = text.slice(n);
      later("type", PER + (/[.!?؟،؛:…,\n]$/.test(c) ? PAUSE : 0), tick);
    };
    later("type", x.think ?? THINK, () => {
      bub.setAttribute("data-phase", "type");
      state("talk");
      tick();
    });
  });
}

/** Start the auto-hide unless the pointer or focus is in the bubble. */
function arm() {
  if (!holdMs || held) return;
  hideAt = now() + holdMs;
  later("hide", holdMs, () => close());
}
function pause() {
  held = true;
  if (!hideAt) return;
  holdMs = Math.max(hideAt - now(), 1500);
  hideAt = 0;
  stopT("hide");
}
function resume() {
  held = false;
  arm();
}

/** Close the bubble; Esc/× return focus to the invoker when focus was in the bubble or on the bot. */
function close(back = false) {
  if (!open) return;
  const ae = doc.activeElement;
  const had = bub.contains(ae) || ae === btn;
  hideBubble(true);
  tour = null;
  live.textContent = "";
  if (back && had) (invoker?.isConnected && !root.contains(invoker) ? invoker : btn).focus();
  if (mode !== "auto") {
    duck();
    on = null;
    later("mv", DUCK, () => (root.hidden = true));
  }
  const f = after;
  after = null;
  f?.();
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
    // Never over an explicit bubble or a hovered spot; the first box speaks after the greeting.
    if (open.kind === "greet") after = () => later("dw", 1200, () => activate(el));
    else later("dw", 1500, () => activate(el));
    return;
  }
  const fresh = el !== active;
  active = el;
  const unseen = !seen(el);
  if (small) {
    // compact: peek up (duck + emerge) with the "!" for a new section; no automatic bubble
    if (unseen && fresh) swap(measure(null));
    else if (!up) goTo(null);
    return badge(unseen);
  }
  if (open && open.el !== el) hideBubble(true); // the old box's line fades as the bot ducks
  if (!unseen) return void goTo(el);
  if (open) return;
  later("say", Math.max(goTo(el), last + 2500 - now()), () => {
    if (el !== cand || open) return;
    say(el, "auto", sayOf(el));
    markSeen(el);
  });
}

function greet() {
  if (scrollY >= 200 || readSessionFlag(GUIDE_GREETED_KEY)) return;
  const el = first ?? boxes()[0];
  if (!el) return;
  writeSessionFlag(GUIDE_GREETED_KEY);
  // it waves (2 × 480ms) while it thinks
  say(el, "greet", small ? o.greeting.compact : o.greeting.full, { think: 960 });
}

function input() {
  if (mode !== "auto") return;
  later("idle", 30_000, () => {
    if (small || open || tour || !active || !shown(active) || readSessionFlag(GUIDE_IDLE_KEY))
      return;
    writeSessionFlag(GUIDE_IDLE_KEY);
    say(active, "auto", o.labels.idle);
  });
  later("sit", 60_000, () => !open && state("sit"));
  if (svg.getAttribute("data-state") === "sit") state("idle");
}

/* ── spots: hover intent / keyboard focus; the bubble comes from the bot at its anchor ── */
function spot(s: Element) {
  if (small || now() - lastSpot < 1200 || tour) return;
  if (open && (open.kind === "explicit" || open.kind === "greet")) return;
  const host = s.closest("[data-guide]");
  if (!host) return;
  say(host, "spot", sayOf(s), { spot: s });
  lastSpot = now();
  const r = R(s);
  const d = desk.getBoundingClientRect();
  css("sx", r.left - d.left);
  css("sy", r.top - d.top);
  css("sw", r.right - r.left);
  css("sh", r.bottom - r.top);
  flag("data-sel", true);
}
const spotOut = () => later("spotOut", 1500, () => open?.kind === "spot" && close());

function observeAll() {
  doc.querySelectorAll("[data-guide]").forEach((e) => io?.observe(e));
  first = boxes("main [data-guide]")[0] ?? null;
}

/** Streams, images or a resize: re-measure the same anchor and reposition in place. */
function reanchor() {
  refresh();
  observeAll();
  // only at rest: a swap in progress places the bot itself
  if (!bot || !root.hasAttribute("data-rest") || (on && !shown(on))) return;
  put(measure(on, small ? undefined : bot.anchor));
  if (open && !bub.hidden) placeBubbleNow();
}

/**
 * The bot's anchor line scrolled out of view (under the menu bar or behind the
 * dock) while its box is still active, e.g. a tall box's top border: re-anchor
 * (it drops down from under the menu bar). An observer on the slot, so no
 * scroll listener; an explicit bubble keeps it where it is.
 */
function watch() {
  so?.disconnect();
  so = new IntersectionObserver(
    ([e]) => {
      if (e!.isIntersecting || !up || !on || small || tour || open?.kind === "explicit") return;
      close();
      goTo(on);
    },
    { rootMargin: `${-chrome.top}px 0px ${-chrome.dock}px 0px` },
  );
  so.observe(slot);
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
      // Last activation wins, except that an unseen first box keeps the band:
      // at scrollY 0 a short first box shares it with the next one (§9 first-box rule).
      const c =
        (first && band.includes(first) && !seen(first) ? first : band[band.length - 1]) ?? null;
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
  watch();
  greet();
  input();
}

/** Hide the bot and forget its box. */
function hideBot() {
  duck();
  on = bot = null;
}
/** Forget the page's boxes (mute, a new page). */
function forget() {
  band = [];
  cand = active = hov = null;
  badge(false);
}

function halt() {
  mode = "explicit";
  ac?.abort();
  io?.disconnect();
  ro?.disconnect();
  so?.disconnect();
  ac = io = ro = so = null;
  for (const k in tm) clearTimeout(tm[k]);
  close();
  hideBubble();
  hideBot();
  forget();
  data("bot", "");
  root.hidden = true;
}

/* ── explicit actions ── */
function nearest(): Element | null {
  let best: Element | null = null;
  let bd = Infinity;
  for (const e of boxes()) {
    const d = centreDistance(R(e), innerHeight);
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
  root.hidden = false;
  say(el, "explicit", sayOf(el));
  if (mode === "auto") {
    markSeen(el);
    if (el === active) badge(false);
  }
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
  // the bubble's height decides how far the box's top lands below the menu bar
  fill(text, "explicit", true);
  css("bw", 340);
  flag("data-measure", true, bub);
  bub.hidden = false;
  const bh = bub.offsetHeight;
  flag("data-measure", false, bub);
  hideBubble();
  tour = t;
  const go = () => tour === t && say(el, "explicit", text, { tour: true });
  if (done) return go();
  const behavior: ScrollBehavior = reduced() ? "auto" : "smooth";
  let target = scrollY;
  if (small) el.scrollIntoView({ block: "start", behavior });
  else {
    target = tourScrollTop(R(el).top + scrollY, chrome.top, bh);
    scrollTo({ top: target, behavior });
  }
  if (!small && Math.abs(target - scrollY) < 2) return go();
  // a stale `scrollend` (an earlier scroll ending) must not start the step mid-way
  let late = small;
  const fin = () => {
    if (!late && Math.abs(scrollY - target) > 2) return;
    removeEventListener("scrollend", fin);
    stopT("tour");
    go();
  };
  addEventListener("scrollend", fin);
  later("tour", 900, () => {
    late = true;
    fin();
  });
}

/* ── one-time DOM wiring (both modes) ── */
function wire() {
  root = o.root;
  desk = (root.closest(".os-desktop") as HTMLElement) ?? root.parentElement!;
  slot = $(".gt-guide-slot");
  btn = $(".gt-guide-sprite");
  svg = $("svg.px-sprite");
  bub = $("#gt-guide-bubble");
  typedEl = $(".gt-guide-typed");
  restEl = $(".gt-guide-rest");
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
  hideBot();
  data("bot", "");
  if (mode !== "auto") return;
  watch();
  if (active) goTo(c ? null : active);
}

const api: GuideApi = {
  act: (t) => (t === "tour" ? runTour() : explain()),
  stop: halt,
  compact: setCompact,
  rescan() {
    close();
    tour = null;
    forget();
    // compact: the bot stays on the dock; desktop: its box is gone
    if (!small) hideBot();
    if (mode !== "auto") return void (root.hidden = true);
    io?.disconnect();
    observeAll();
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
