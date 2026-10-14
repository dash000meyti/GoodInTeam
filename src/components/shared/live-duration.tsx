"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import { useLocale } from "@/i18n/client";

/**
 * Ticking "h:mm:ss" since `since` (epoch ms), plus an optional base offset.
 * Renders a stable value on the server and starts ticking after mount.
 */
export function LiveDuration({
  since,
  baseMs = 0,
  serverNow,
  className,
}: {
  since: number;
  baseMs?: number;
  serverNow: number;
  className?: string;
}) {
  const locale = useLocale();
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start ticking from the client clock
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={className} data-numeric suppressHydrationWarning>
      {formatDuration(baseMs + Math.max(0, now - since), locale, true)}
    </span>
  );
}
