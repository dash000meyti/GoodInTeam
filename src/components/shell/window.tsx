import type { ReactNode } from "react";
import { PixelText, PixelTextSet } from "@/components/brand/pixel-art";
import { cn } from "@/lib/utils";
import { OsLights } from "./os-lights";

export type WindowPath = string | readonly { id: string; text: string }[];

/**
 * An OS window (spec §5.6): 10px radius, hairline border, card surface,
 * `shadow-card` (`elevated` → `--shadow-window`, only the hero and the panel
 * window). The 32px bar holds 10px lights and the Latin pixel path
 * (aria-hidden, LTR). A path list renders ONE `PixelTextSet` whose first item
 * shows; consumers swap the visible path with `:has()` rules on
 * `.px-set>[data-path-id=…]` (zero-JS tabs) — one window whatever the count.
 * `tone="ink"`: #1C1C1E with #F3F3F3 text in both modes.
 */
export function Window({
  path,
  elevated,
  tone = "default",
  className,
  children,
}: {
  path: WindowPath;
  elevated?: boolean;
  tone?: "default" | "ink";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn("os-win", className)}
      data-elevated={elevated ? "" : undefined}
      data-tone={tone}
    >
      <div className="os-win-bar">
        <OsLights size={10} />
        {typeof path === "string" ? (
          <PixelText text={path} cell={2} tone="ink" className="os-win-path" />
        ) : (
          <PixelTextSet items={path} cell={2} tone="ink" className="os-win-path" />
        )}
      </div>
      <div className="os-win-body">{children}</div>
    </div>
  );
}
