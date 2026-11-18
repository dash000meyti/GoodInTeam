import { Children, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { packRows } from "@/components/site/frame-plan";
import {
  FrameBox,
  FrameCell,
  FrameFiller,
  FrameGrid,
  type FrameCols,
} from "@/components/shell/frame";
import { cn } from "@/lib/utils";

/** Icon colour per tone (`-ink` text tokens; the tile itself is a neutral hairline square). */
const tones = {
  primary: "text-primary-ink",
  info: "text-info-ink",
  warning: "text-warning-ink",
  violet: "text-[#5119b7] dark:text-[#c684ff]",
  destructive: "text-[#b0242a] dark:text-[#ff9592]",
  success: "text-success-ink",
} as const;

export type StatTone = keyof typeof tones;

/** The square icon tile of a stat cell (hairline, card surface, tone-ink icon). */
export function StatIcon({
  icon: Icon,
  tone = "primary",
  className,
}: {
  icon: LucideIcon;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center border border-frame-line bg-card",
        tones[tone],
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

/** Stat value type: big, bold, tabular (the site's StatsCells, at panel density). */
export const STAT_VALUE_CLASS =
  "text-[22px] leading-[1.2] font-bold tabular-nums break-words [:lang(en)_&]:tracking-[-0.03em] [:lang(fa)_&]:font-extrabold md:text-[28px] md:leading-[1.15]";

/**
 * One KPI cell of a framed stat grid: label and icon on top, the value, a
 * hint. A cell, so it always lives in a `StatRow` (inside a box) or a
 * `StatGrid` (its own box): stats share hairlines instead of floating.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <FrameCell className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 pt-1.5 text-sm leading-5 font-semibold text-muted-foreground">
          {label}
        </p>
        {icon && <StatIcon icon={icon} tone={tone} />}
      </div>
      <div className={STAT_VALUE_CLASS}>{value}</div>
      {hint && <div className="text-xs leading-5 text-muted-foreground">{hint}</div>}
    </FrameCell>
  );
}

/** Grid columns for n stats: 2 → 2, 3 → 3, otherwise 4 (2×2 on phones). */
function colsFor(n: number): FrameCols {
  return n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4;
}

/**
 * A row of stat cells sharing hairlines, without a box: for a box that
 * already exists (`<PageHeader>{<StatRow>…</StatRow>}</PageHeader>`, a Card).
 * Columns follow the count; the last row is completed with dots fillers.
 */
export function StatRow({
  children,
  cols,
  className,
}: {
  children: ReactNode;
  cols?: FrameCols;
  className?: string;
}) {
  const n = Children.toArray(children).length;
  const c = cols ?? colsFor(n);
  const spans = Array.from({ length: n }, () => undefined);
  return (
    <FrameGrid cols={c} className={className}>
      {children}
      <FrameFiller
        units={{ md: packRows(spans, c, "md").trailing, lg: packRows(spans, c, "lg").trailing }}
      />
    </FrameGrid>
  );
}

/** A framed box holding one `StatRow`: several stats form one grid, never separate cards. */
export function StatGrid({
  children,
  cols,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  cols?: FrameCols;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <FrameBox
      as={ariaLabel ? "section" : "div"}
      density="compact"
      ariaLabel={ariaLabel}
      className={className}
    >
      <StatRow cols={cols}>{children}</StatRow>
    </FrameBox>
  );
}
