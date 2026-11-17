"use client";

import { useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import { formatClock, msToNextMinute } from "./clock-format";

/**
 * Menu-bar clock (spec §5.6), studio time. Client-only: the server snapshot
 * is "" (no Date during server render); the client ticks at each minute
 * boundary, paused while the tab is hidden. `.os-clock` has a FIXED width
 * (`--clock-w`) shared with ClockSkeleton, so the streamed hole never shifts
 * the bar. Render inside <Suspense fallback={<ClockSkeleton />}>.
 */
function subscribe(onChange: () => void) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    clearTimeout(timeout);
    clearInterval(interval);
  };
  const start = () => {
    stop();
    timeout = setTimeout(() => {
      onChange();
      interval = setInterval(onChange, 60_000);
    }, msToNextMinute(Date.now()));
  };
  const onVisibility = () => {
    if (document.hidden) stop();
    else {
      onChange();
      start();
    }
  };
  if (!document.hidden) start();
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    stop();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function OsClock({ locale, tz, label }: { locale: Locale; tz: string; label: string }) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const { text, iso } = formatClock(new Date(), locale, tz);
      return `${iso}|${text}`;
    },
    () => "",
  );
  const sep = value.indexOf("|");
  const iso = sep > 0 ? value.slice(0, sep) : undefined;
  const text = sep > 0 ? value.slice(sep + 1) : "";
  return (
    <time
      className="os-clock tabular-nums"
      dateTime={iso}
      title={label}
      aria-label={text ? `${label}: ${text}` : label}
    >
      {text}
    </time>
  );
}

/** Same fixed box as the clock, for the Suspense fallback. */
export function ClockSkeleton() {
  return <span className="os-clock" aria-hidden />;
}
