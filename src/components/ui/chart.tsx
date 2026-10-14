"use client";

import * as React from "react";
import * as Recharts from "recharts";
import { cn } from "@/lib/utils";

/**
 * shadcn-style chart primitives over Recharts.
 *
 * const config = { hours: { label: "Hours", color: "var(--chart-1)" } } satisfies ChartConfig;
 * <ChartContainer config={config} className="h-64">
 *   <BarChart data={rows}><Bar dataKey="hours" fill="var(--color-hours)" radius={6} />
 *     <ChartTooltip content={<ChartTooltipContent />} /></BarChart>
 * </ChartContainer>
 *
 * Each config key becomes a CSS var `--color-<key>` usable in fills/strokes.
 */
export type ChartConfig = Record<string, { label?: React.ReactNode; color?: string; icon?: React.ComponentType }>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const ctx = React.use(ChartContext);
  if (!ctx) throw new Error("useChart must be used within <ChartContainer />");
  return ctx;
}

function ChartContainer({
  config,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof Recharts.ResponsiveContainer>["children"];
}) {
  const style = Object.fromEntries(
    Object.entries(config)
      .filter(([, v]) => v.color)
      .map(([k, v]) => [`--color-${k}`, v.color]),
  ) as React.CSSProperties;
  return (
    <ChartContext value={{ config }}>
      <div
        data-slot="chart"
        dir="ltr"
        style={style}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-hidden [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/60 [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <Recharts.ResponsiveContainer>{children}</Recharts.ResponsiveContainer>
      </div>
    </ChartContext>
  );
}

const ChartTooltip = Recharts.Tooltip;

interface TooltipPayloadItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  hideLabel,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: React.ReactNode;
  formatter?: (value: number | string, key: string) => React.ReactNode;
  labelFormatter?: (label: React.ReactNode) => React.ReactNode;
  hideLabel?: boolean;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;
  return (
    <div className="grid min-w-36 gap-1.5 rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs shadow-dropdown backdrop-blur">
      {!hideLabel && <div className="font-bold">{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.name ?? "");
        const conf = config[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: item.color ?? conf?.color }} />
            <span className="text-muted-foreground">{conf?.label ?? key}</span>
            <span className="ms-auto font-mono font-semibold tabular-nums">
              {formatter ? formatter(item.value ?? 0, key) : item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const ChartLegend = Recharts.Legend;

function ChartLegendContent({ payload }: { payload?: { dataKey?: string | number; color?: string; value?: string }[] }) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.value ?? "");
        return (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} />
            {config[key]?.label ?? key}
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
