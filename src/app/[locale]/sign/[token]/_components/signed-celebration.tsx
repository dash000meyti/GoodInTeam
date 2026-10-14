"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import { SIGNED_FLAG } from "./sign-panel";

const COLORS = ["var(--primary)", "#ffab00", "#00b8d9", "#8e33ff", "#ff5630", "#22c55e"];

/**
 * Subtle CSS-only celebration shown once right after signing (the form sets a
 * sessionStorage flag before submitting; this reads and clears it).
 */
export function SignedCelebration({
  id,
  children,
  fallback,
}: {
  id: string;
  children: React.ReactNode;
  /** Shown on later visits (no celebration). */
  fallback: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const key = SIGNED_FLAG + id;
      const at = Number(sessionStorage.getItem(key));
      if (at && Date.now() - at < 5 * 60_000) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot flag from sessionStorage
        setShow(true);
        sessionStorage.removeItem(key);
      }
    } catch {}
  }, [id]);

  if (!show) return fallback;
  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-2xl border border-success/30 bg-success/10 p-6 text-center print:hidden"
    >
      <style>{`
        @keyframes gt-confetti { 0% { transform: translate3d(0,-10px,0) rotate(0); opacity: 1 }
          100% { transform: translate3d(var(--dx), 220px, 0) rotate(var(--r)); opacity: 0 } }
        @keyframes gt-pop { 0% { transform: scale(.4); opacity: 0 } 60% { transform: scale(1.12); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes gt-ring { 0% { box-shadow: 0 0 0 0 rgb(34 197 94 / .45) } 100% { box-shadow: 0 0 0 22px rgb(34 197 94 / 0) } }
        @media (prefers-reduced-motion: reduce) { .gt-confetti-piece { display: none } }
      `}</style>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full">
        {Array.from({ length: 26 }, (_, i) => (
          <span
            key={i}
            className="gt-confetti-piece absolute top-0 block rounded-[2px]"
            style={
              {
                insetInlineStart: `${(i * 37) % 100}%`,
                width: i % 3 ? 6 : 8,
                height: i % 2 ? 10 : 6,
                background: COLORS[i % COLORS.length],
                animation: `gt-confetti ${1.6 + (i % 5) * 0.25}s cubic-bezier(.2,.6,.4,1) ${(i % 7) * 0.08}s both`,
                "--dx": `${((i * 53) % 80) - 40}px`,
                "--r": `${(i % 2 ? 1 : -1) * (180 + ((i * 47) % 360))}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="relative flex flex-col items-center gap-3">
        <span
          className="flex size-14 items-center justify-center rounded-full bg-success text-white"
          style={{ animation: "gt-pop .5s ease-out both, gt-ring 1.4s ease-out .4s 2" }}
        >
          <CheckIcon className="size-7" strokeWidth={3} />
        </span>
        {children}
      </div>
    </div>
  );
}
