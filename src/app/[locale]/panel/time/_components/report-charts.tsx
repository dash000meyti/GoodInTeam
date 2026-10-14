"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useLocale, useT } from "@/i18n/client";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

export interface ChartBucket {
  label: string;
  /** series key → hours */
  [key: string]: string | number;
}

const hoursToMs = (h: number) => h * 3_600_000;

/** Stacked bars: hours per day (or week) by project. */
export function StackedHoursChart({
  data,
  series,
}: {
  data: ChartBucket[];
  series: ChartSeries[];
}) {
  const locale = useLocale();
  const rtl = locale === "fa";
  const config: ChartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.name, color: s.color }]),
  );
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ top: 8, left: 4, right: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          reversed={rtl}
          minTickGap={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          orientation={rtl ? "right" : "left"}
          tickFormatter={(v: number) => formatNumber(v, locale)}
        />
        <ChartTooltip
          cursor
          content={
            <ChartTooltipContent formatter={(v) => formatDuration(hoursToMs(Number(v)), locale)} />
          }
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="hours"
            fill={`var(--color-${s.key})`}
            radius={i === series.length - 1 ? [6, 6, 0, 0] : 0}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/** Donut of hours per project with a legend list. */
export function ProjectDonut({
  items,
  totalLabel,
}: {
  items: { key: string; name: string; color: string; hours: number }[];
  totalLabel: string;
}) {
  const locale = useLocale();
  const t = useT();
  const total = items.reduce((s, i) => s + i.hours, 0);
  const config: ChartConfig = Object.fromEntries(
    items.map((s) => [s.key, { label: s.name, color: s.color }]),
  );
  return (
    <div className="grid gap-6">
      <div className="relative mx-auto size-56">
        <ChartContainer config={config} className="aspect-square size-56">
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof items)[number] | undefined;
                if (!active || !p) return null;
                return (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs shadow-dropdown">
                    <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: p.color }} />
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="ms-2 font-mono font-semibold">
                      {formatDuration(hoursToMs(p.hours), locale)}
                    </span>
                  </div>
                );
              }}
            />
            <Pie
              data={items}
              dataKey="hours"
              nameKey="key"
              innerRadius={64}
              outerRadius={100}
              paddingAngle={items.length > 1 ? 2 : 0}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {items.map((i) => (
                <Cell key={i.key} fill={i.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{t.common.total}</span>
          <span className="font-mono text-2xl font-black tabular-nums">{totalLabel}</span>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((i) => {
          const pct = total ? (i.hours / total) * 100 : 0;
          return (
            <li key={i.key} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: i.color }}
                />
                <span className="min-w-0 flex-1 truncate font-semibold">{i.name}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatDuration(hoursToMs(i.hours), locale)}
                </span>
                <span className="w-10 text-end text-xs font-bold tabular-nums">
                  {formatPercent(pct, locale)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: i.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Weekly hours bars for the project panel. */
export function WeeklyHoursChart({
  data,
  label,
}: {
  data: { label: string; hours: number; billable: number }[];
  label: string;
}) {
  const locale = useLocale();
  const t = useT();
  const rtl = locale === "fa";
  const config: ChartConfig = {
    hours: { label, color: "var(--chart-1)" },
    billable: { label: t.time.billable, color: "var(--chart-3)" },
  };
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ top: 8, left: 4, right: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          reversed={rtl}
          minTickGap={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          orientation={rtl ? "right" : "left"}
          tickFormatter={(v: number) => formatNumber(v, locale)}
        />
        <ChartTooltip
          cursor
          content={
            <ChartTooltipContent formatter={(v) => formatDuration(hoursToMs(Number(v)), locale)} />
          }
        />
        <Bar dataKey="hours" fill="var(--color-hours)" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartContainer>
  );
}
