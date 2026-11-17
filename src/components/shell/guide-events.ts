/**
 * The guide contract (spec §5.6, §15.1–15.2; pure, no React). Storage keys,
 * DOM events and the attribute helpers every track uses to narrate the site.
 * All storage access is wrapped in try/catch (private mode, blocked storage).
 */

/** localStorage: `"off"` mutes automatic narration (explicit actions still work). */
export const GUIDE_PREF_KEY = "gt-guide";
/** localStorage: `"off"` stops the panel's automatic module tips. */
export const GUIDE_TIPS_KEY = "gt-guide-tips";
/** localStorage: `"1"` lets the guide auto-speak under `navigator.webdriver` (e2e). */
export const GUIDE_TEST_KEY = "gt-guide-test";
/** sessionStorage: JSON array of `pathname#key` lines already spoken. */
export const GUIDE_SEEN_KEY = "gt-guide-seen";
/** sessionStorage: `"1"` once the greeting has played. */
export const GUIDE_GREETED_KEY = "gt-guide-greeted";
/** sessionStorage: `"1"` once the idle line has played. */
export const GUIDE_IDLE_KEY = "gt-guide-idle";
/** localStorage prefix: `gt-guide-mod:<navKey>` marks a panel module as peeked. */
export const GUIDE_MOD_PREFIX = "gt-guide-mod:";

/** window CustomEvent: `detail: { type }`. */
export const GUIDE_EVENT = "gt:guide";
/** window Event fired when the mute preference changes. */
export const GUIDE_PREF_EVENT = "gt:guide-pref";

export type GuideEventType = "explain" | "tour" | "show" | "hide";
export interface GuideEventDetail {
  type: GuideEventType;
}

/** `"off"` when muted, `null` when on (or storage is unavailable). */
export function readGuidePref(): "off" | null {
  try {
    return localStorage.getItem(GUIDE_PREF_KEY) === "off" ? "off" : null;
  } catch {
    return null;
  }
}

/** Turn the guide on (removes the key) or off; dispatches `gt:guide-pref`. */
export function writeGuidePref(on: boolean): void {
  try {
    if (on) localStorage.removeItem(GUIDE_PREF_KEY);
    else localStorage.setItem(GUIDE_PREF_KEY, "off");
  } catch {}
  try {
    window.dispatchEvent(new Event(GUIDE_PREF_EVENT));
  } catch {}
}

export function readSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeSessionFlag(key: string): void {
  try {
    sessionStorage.setItem(key, "1");
  } catch {}
}

/** Ask the guide to explain the active part, run the tour, or show/hide itself. */
export function dispatchGuide(type: GuideEventType): void {
  try {
    window.dispatchEvent(new CustomEvent<GuideEventDetail>(GUIDE_EVENT, { detail: { type } }));
  } catch {}
}

/**
 * Section narration: spread on a section root (FrameSection does it for you).
 * `say` must paraphrase copy visible in that section (§10.3) — no new facts.
 */
export function guideAttrs(key: string, say: string) {
  return { "data-guide": key, "data-guide-say": say } as const;
}

/** A "special part" (hover/focus): `say` is the visible tagline or excerpt, ≤140 chars. */
export function spotAttrs(key: string, say: string) {
  return { "data-guide-spot": key, "data-guide-say": say } as const;
}
