"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useI18n, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";

const HOURS = [6.5, 7.25, 5.75, 8, 4.5, 2, 0];
const INCOME = [42, 38, 51, 47, 60, 58];
const EXPENSE = [18, 22, 19, 25, 21, 24];

/** Single-series bars: no legend (the title names it), tooltip on hover, 4px rounded tops. */
export function BarChartDemo() {
  const { locale, dir } = useI18n();
  const d = useT().designSystem;
  const data = d.c_weekdays.split(",").map((day, i) => ({ day, hours: HOURS[i] ?? 0 }));
  const config = { hours: { label: d.c_hours, color: "var(--chart-1)" } } satisfies ChartConfig;
  const fmt = (v: number | string) => formatNumber(Number(v), locale, { maximumFractionDigits: 1 });
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ top: 8, left: 0, right: 0, bottom: 0 }} barCategoryGap={10}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} reversed={dir === "rtl"} />
        <YAxis
          width={32}
          tickLine={false}
          axisLine={false}
          orientation={dir === "rtl" ? "right" : "left"}
          tickFormatter={fmt}
        />
        <ChartTooltip cursor content={<ChartTooltipContent formatter={fmt} />} />
        <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartContainer>
  );
}

/** Two series over time: legend + crosshair tooltip, 2px lines, soft fills. */
export function AreaChartDemo() {
  const { locale, dir } = useI18n();
  const d = useT().designSystem;
  const data = d.c_months.split(",").map((month, i) => ({
    month,
    income: INCOME[i] ?? 0,
    expense: EXPENSE[i] ?? 0,
  }));
  const config = {
    income: { label: d.c_income, color: "var(--chart-1)" },
    expense: { label: d.c_expense, color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const fmt = (v: number | string) => formatNumber(Number(v), locale);
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
        <defs>
          {(["income", "expense"] as const).map((k) => (
            <linearGradient key={k} id={`ds-fill-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${k})`} stopOpacity={0.28} />
              <stop offset="100%" stopColor={`var(--color-${k})`} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} reversed={dir === "rtl"} />
        <YAxis
          width={32}
          tickLine={false}
          axisLine={false}
          orientation={dir === "rtl" ? "right" : "left"}
          tickFormatter={fmt}
        />
        <ChartTooltip content={<ChartTooltipContent formatter={fmt} />} />
        <ChartLegend content={<ChartLegendContent />} />
        {(["income", "expense"] as const).map((k) => (
          <Area
            key={k}
            dataKey={k}
            type="monotone"
            stroke={`var(--color-${k})`}
            strokeWidth={2}
            fill={`url(#ds-fill-${k})`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

/** Part-to-whole with ≤ 5 slices: donut + total in the hole + a value legend (no color-only identity). */
export function DonutChartDemo() {
  const { locale } = useI18n();
  const d = useT().designSystem;
  const rows = [
    { key: "dev", label: d.c_dev, value: 34, color: "var(--chart-1)" },
    { key: "design", label: d.c_design, value: 18, color: "var(--chart-2)" },
    { key: "meetings", label: d.c_meetings, value: 7, color: "var(--chart-3)" },
    { key: "support", label: d.c_support, value: 5, color: "var(--chart-4)" },
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);
  const config = Object.fromEntries(
    rows.map((r) => [r.key, { label: r.label, color: r.color }]),
  ) satisfies ChartConfig;
  const fmt = (v: number | string) => formatNumber(Number(v), locale);
  return (
    <div className="grid w-full items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative">
        <ChartContainer config={config} className="aspect-square h-48 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel formatter={fmt} />} />
            <Pie
              data={rows}
              dataKey="value"
              nameKey="key"
              innerRadius="62%"
              outerRadius="92%"
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {rows.map((r) => (
                <Cell key={r.key} fill={r.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold tabular-nums">{fmt(total)}</span>
          <span className="text-xs text-muted-foreground">{d.c_hours}</span>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: r.color }}
            />
            <span className="flex-1 text-muted-foreground">{r.label}</span>
            <span className="font-semibold tabular-nums">{fmt(r.value)}</span>
            <span className="w-10 text-end text-xs text-muted-foreground tabular-nums">
              {formatNumber(r.value / total, locale, { style: "percent" })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
