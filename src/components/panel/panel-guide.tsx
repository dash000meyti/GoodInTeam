"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { usePathname } from "next/navigation";
import { XIcon } from "lucide-react";
import { PixelAvatar } from "@/components/brand/pixel-art";
import { DockTile } from "@/components/shell/dock";
import {
  GUIDE_EVENT,
  GUIDE_MOD_PREFIX,
  GUIDE_PREF_EVENT,
  GUIDE_TIPS_KEY,
  type GuideEventDetail,
} from "@/components/shell/guide-events";
import { Switch } from "@/components/ui/switch";
import { stripLocale } from "@/i18n/config";
import { useT } from "@/i18n/client";
import type { UserRole } from "@/server/db/schema/auth";
import { navKeyFor } from "./nav-config";

/* ── Guide tips preference (localStorage `gt-guide-tips`: "off" or absent) ── */

function subscribeTips(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(GUIDE_PREF_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(GUIDE_PREF_EVENT, onChange);
  };
}
function readTips() {
  try {
    return localStorage.getItem(GUIDE_TIPS_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Automatic module tips on/off, shared by the bubble, Control Center and Settings. */
export function useGuideTips() {
  const on = useSyncExternalStore(subscribeTips, readTips, () => true);
  const setOn = useCallback((next: boolean) => {
    try {
      if (next) localStorage.removeItem(GUIDE_TIPS_KEY);
      else localStorage.setItem(GUIDE_TIPS_KEY, "off");
    } catch {}
    window.dispatchEvent(new Event(GUIDE_PREF_EVENT));
  }, []);
  return [on, setOn] as const;
}

/* ── Controller ── */

/**
 * The `guide.panel_*` lines speak to the team (e.g. "you decide what the
 * client sees"), so on the shared modules a client reads its own line, which
 * paraphrases the portal page's subtitle.
 */
const CLIENT_TIPS: Record<string, string> = {
  projects: "clientProjects",
  invoices: "clientInvoices",
  contracts: "clientContracts",
};

/** The tip a role reads for a module (`guide.panel_<key>`). */
export function tipKeyFor(navKey: string, role: UserRole): string {
  return (role === "client" && CLIENT_TIPS[navKey]) || navKey;
}

const BUBBLE_ID = "panel-guide";
const ME_ID = "panel-guide-me";
const DESKTOP = "(width >= 64rem)";
const PEEK_DELAY = 1500;
const PEEK_FOR = 5000;

export interface PanelGuide {
  open: boolean;
  /** The active module (`gt-guide-mod:<navKey>` marks its one-time peek). */
  navKey: string;
  /** The tip line of the active module for this role. */
  tip: string;
  /** Polite live-region text: set only by explicit opens. */
  live: string;
  /** Open; `explicit` opens are announced and never auto-close. */
  show: (opts: { invoker?: HTMLElement | null; explicit: boolean }) => void;
  hide: (returnFocus?: boolean) => void;
  toggle: (invoker: HTMLElement) => void;
  /** Hovering or focusing a peeking bubble keeps it open. */
  holdPeek: () => void;
}

/**
 * The quiet panel GoodInBot (spec §10.6): state for the Me tile and its
 * bubble. Handles `gt:guide` (the App menu's "About {module}"), Esc, outside
 * clicks and the one-time per-module peek (≥1024px, tips on, never under
 * webdriver).
 */
export function usePanelGuide(role: UserRole): PanelGuide {
  const t = useT();
  const navKey = navKeyFor(stripLocale(usePathname()).path, role);
  const tip = (t.guide as Record<string, string>)[`panel_${tipKeyFor(navKey, role)}`] ?? "";
  const [open, setOpen] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [live, setLive] = useState("");
  const [tipsOn] = useGuideTips();
  const invoker = useRef<HTMLElement | null>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show: PanelGuide["show"] = ({ invoker: from, explicit }) => {
    clearTimeout(peekTimer.current);
    if (from !== undefined) invoker.current = from;
    setPeeking(!explicit);
    setOpen(true);
    if (explicit) setLive(`${t.guide.name}: ${tip}`);
  };

  const hide: PanelGuide["hide"] = (returnFocus = false) => {
    clearTimeout(peekTimer.current);
    setOpen(false);
    setPeeking(false);
    setLive("");
    const to = invoker.current;
    const active = document.activeElement;
    const inBubble = !!active && !!document.getElementById(BUBBLE_ID)?.contains(active);
    if (returnFocus && to?.isConnected && (!active || active === document.body || inBubble))
      to.focus();
  };

  const toggle: PanelGuide["toggle"] = (from) =>
    open && !peeking ? hide(true) : show({ invoker: from, explicit: true });

  const holdPeek = () => {
    if (!peeking) return;
    clearTimeout(peekTimer.current);
    setPeeking(false);
  };

  // A new module closes a peek; an explicit bubble follows the module and re-announces.
  const [lastKey, setLastKey] = useState(navKey);
  if (lastKey !== navKey) {
    setLastKey(navKey);
    if (open && peeking) {
      setOpen(false);
      setPeeking(false);
    } else if (open) setLive(`${t.guide.name}: ${tip}`);
  }

  // App menu → "About {module}" (and any other gt:guide dispatch).
  const onGuide = useEffectEvent((type: GuideEventDetail["type"] | undefined) => {
    if (type === "hide") return hide(false);
    if (type !== "explain" && type !== "show" && type !== "tour") return;
    const a = document.activeElement;
    show({ invoker: a instanceof HTMLElement && a !== document.body ? a : null, explicit: true });
  });
  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent<GuideEventDetail>).detail?.type;
      // After a menu closes, Radix returns focus to its trigger: that is the invoker.
      requestAnimationFrame(() => onGuide(type));
    };
    window.addEventListener(GUIDE_EVENT, handler);
    return () => window.removeEventListener(GUIDE_EVENT, handler);
  }, []);

  // Esc and outside clicks close it (never a dialog: no focus trap, no inert page).
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape" && !e.defaultPrevented) hide(true);
  });
  const onDown = useEffectEvent((e: PointerEvent) => {
    const target = e.target as Node;
    if (document.getElementById(BUBBLE_ID)?.contains(target)) return;
    if (document.getElementById(ME_ID)?.contains(target)) return;
    hide(false);
  });
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  // One-time peek per module per browser, desktop only, tips on, never under webdriver.
  useEffect(() => {
    if (!tipsOn || navigator.webdriver || !matchMedia(DESKTOP).matches) return;
    const key = GUIDE_MOD_PREFIX + navKey;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      return;
    }
    peekTimer.current = setTimeout(() => {
      if (document.hidden || !matchMedia(DESKTOP).matches) return;
      try {
        localStorage.setItem(key, "1");
      } catch {}
      setPeeking(true);
      setOpen(true);
      peekTimer.current = setTimeout(() => {
        setOpen(false);
        setPeeking(false);
      }, PEEK_FOR);
    }, PEEK_DELAY);
    return () => clearTimeout(peekTimer.current);
  }, [navKey, tipsOn]);

  return { open, navKey, tip, live, show, hide, toggle, holdPeek };
}

/** The Me tile (dock slot, desktop only): named by its visible label `guide.name`. */
export function MeTile({ guide }: { guide: PanelGuide }) {
  const t = useT();
  return (
    <button
      id={ME_ID}
      type="button"
      className="os-dock-item"
      aria-expanded={guide.open}
      aria-controls={BUBBLE_ID}
      onClick={(e) => guide.toggle(e.currentTarget)}
    >
      <DockTile variant="brand">
        <PixelAvatar part="head" cell={2} />
      </DockTile>
      <span className="os-dock-label">{t.guide.name}</span>
    </button>
  );
}

/**
 * The bubble: `popover="manual"`, `role="group"` (never a dialog, never steals
 * focus). Above the Me tile at ≥1024px; centred above the tab bar below.
 */
export function PanelGuideBubble({ guide }: { guide: PanelGuide }) {
  const t = useT();
  const [tipsOn, setTipsOn] = useGuideTips();
  const [pos, setPos] = useState<CSSProperties | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);
  const { open } = guide;

  // Top layer in sync with state; inline-start aligned with the Me tile on desktop.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.showPopover !== "function") return;
    const place = () => {
      const me = document.getElementById(ME_ID);
      const r = me?.getBoundingClientRect();
      if (!matchMedia(DESKTOP).matches || !r?.width) return setPos(undefined);
      const rtl = document.documentElement.dir === "rtl";
      const start = rtl ? window.innerWidth - r.right : r.left;
      const max = window.innerWidth - 340 - 12;
      setPos({ insetInlineStart: Math.max(12, Math.min(start, max)) });
    };
    try {
      if (open && !el.matches(":popover-open")) el.showPopover();
      if (!open && el.matches(":popover-open")) el.hidePopover();
    } catch {}
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  return (
    <>
      <div
        ref={ref}
        id={BUBBLE_ID}
        popover="manual"
        role="group"
        aria-labelledby="panel-guide-name"
        className="pm-guide"
        data-anchored={pos ? "" : undefined}
        style={pos}
        onPointerEnter={guide.holdPeek}
        onFocus={guide.holdPeek}
      >
        <div className="flex items-start gap-3">
          <span className="pm-guide-avatar" aria-hidden>
            <PixelAvatar cell={3} />
          </span>
          <div className="min-w-0 flex-1 space-y-1 pt-0.5">
            <p id="panel-guide-name" className="text-xs font-bold text-muted-foreground">
              {t.guide.name}
            </p>
            <p className="text-sm leading-6">{guide.tip}</p>
          </div>
          <button
            type="button"
            onClick={() => guide.hide(true)}
            className="-me-1 -mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-4" aria-hidden />
            <span className="sr-only">{t.common.close}</span>
          </button>
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 border-t border-dashed pt-3 text-xs font-semibold text-muted-foreground">
          {t.guide.tipsAuto}
          <Switch checked={tipsOn} onCheckedChange={setTipsOn} />
        </label>
      </div>
      <p className="sr-only" aria-live="polite">
        {guide.live}
      </p>
    </>
  );
}
