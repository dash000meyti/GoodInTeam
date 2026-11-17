"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  GUIDE_EVENT,
  GUIDE_PREF_EVENT,
  GUIDE_TEST_KEY,
  readGuidePref,
  writeGuidePref,
  type GuideEventDetail,
} from "@/components/shell/guide-events";
import type { GuideApi, GuideLabels } from "./guide-engine";

/**
 * Boots the guide engine lazily (spec §10.4; ≤0.8KB gz, renders nothing).
 * Automatic mode starts after `load` + idle (or the first pointerdown /
 * keydown) unless the guide is muted, Save-Data is on, the page prints, or
 * the browser is automated without `gt-guide-test=1`. `gt:guide` explain /
 * tour always work: while muted they start the engine in explicit mode.
 * Direction and reduced motion are read by the engine itself (both can
 * change at runtime); compact mode follows this media query.
 */
export function GuideLoader({
  greeting,
  labels,
}: {
  greeting: { full: string; compact: string };
  labels: GuideLabels;
}) {
  const path = usePathname();
  const api = useRef<GuideApi | null>(null);

  useEffect(() => {
    const root = document.getElementById("gt-guide")!;
    const mq = matchMedia("(max-width: 1023px), (pointer: coarse)");
    const ac = new AbortController();
    const sig = { signal: ac.signal };
    let booted = false;
    const muted = () => {
      try {
        return (
          readGuidePref() === "off" ||
          !!(navigator as { connection?: { saveData?: boolean } }).connection?.saveData ||
          matchMedia("print").matches ||
          (navigator.webdriver && localStorage.getItem(GUIDE_TEST_KEY) !== "1")
        );
      } catch {
        return true;
      }
    };
    // start() is idempotent: calling it again in the current mode is a no-op.
    const load = (mode: "auto" | "explicit") =>
      import("./guide-engine").then(
        (m) => (api.current = m.start({ root, compact: mq.matches, mode, greeting, labels })),
      );
    const go = () => {
      if (booted || ac.signal.aborted || muted()) return;
      booted = true;
      load("auto");
    };
    const idle = () =>
      "requestIdleCallback" in window
        ? requestIdleCallback(go, { timeout: 3000 })
        : setTimeout(go, 1500);
    if (document.readyState === "complete") idle();
    else addEventListener("load", idle, { ...sig, once: true });
    addEventListener("pointerdown", go, { ...sig, once: true, passive: true });
    addEventListener("keydown", go, { ...sig, once: true });

    addEventListener(
      GUIDE_EVENT,
      (e) => {
        const t = (e as CustomEvent<GuideEventDetail>).detail?.type;
        if (t === "show" || t === "hide") writeGuidePref(t === "show");
        else if (t === "explain" || t === "tour") {
          const m = booted ? false : muted();
          booted ||= !m;
          load(m ? "explicit" : "auto").then((a) => a.act(t));
        }
      },
      sig,
    );
    addEventListener(
      GUIDE_PREF_EVENT,
      () => {
        booted = !muted();
        if (booted) load("auto");
        else api.current?.stop();
      },
      sig,
    );
    mq.addEventListener("change", () => api.current?.compact(mq.matches), sig);
    return () => ac.abort();
  }, [greeting, labels]);

  // Soft navigation: re-observe the new page's boxes (a no-op before the engine loads).
  useEffect(() => api.current?.rescan(), [path]);

  return null;
}
