"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BarChart3Icon, TableIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SelectField } from "@/components/shared/select-field";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { format } from "@/i18n/format-message";
import { useI18n, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { formatMoneySigned } from "@/components/finance/money";
import { cn } from "@/lib/utils";
import {
  analyze,
  APPROX,
  flowCurrencies,
  minorToMajor,
  type FlowRow,
  type RateTable,
} from "@/server/modules/finance/calc";
import { BoxCell, TOGGLE_CHIP, TOGGLE_CHIPS } from "./frame-bits";

interface Lookup {
  id: string;
  name: string;
  color: string | null;
}

/** Semantic colors (validated for light & dark surfaces). */
const seriesVars =
  "[--color-income:#00a76f] [--color-expense:#ff5630] dark:[--color-expense:#e8502e]";
const OTHER_COLOR = "#919eab";

/**
 * Overview analytics as one framed box: a toolbar row (range + currency)
 * scopes every chart; then the cash flow cell beside `aside` (2fr | 1fr from
 * lg); then by category, top clients and `receivables` as cells sharing
 * hairlines (`aside` and `receivables` are server-rendered cells, the latter
 * spanning the md row). Switching is instant (all data for 12 months is
 * preloaded as compact aggregated rows).
 */
export function FinanceAnalytics({
  rows,
  months,
  base,
  rates,
  categories,
  clients,
  aside,
  receivables,
}: {
  rows: FlowRow[];
  months: { label: string; full: string }[];
  base: string;
  rates: RateTable;
  categories: Lookup[];
  clients: Lookup[];
  /** A FrameCell (the 1fr beside the cash flow). */
  aside: ReactNode;
  /** A FrameCell with `span="md2"` (the third cell of the last row). */
  receivables: ReactNode;
}) {
  const t = useT();
  const f = t.finance;
  const { locale, dir } = useI18n();
  const currencies = useMemo(() => {
    const list = flowCurrencies(rows);
    if (!list.includes(base)) list.unshift(base);
    return list;
  }, [rows, base]);
  const [range, setRange] = useState<6 | 12>(6);
  const [currency, setCurrency] = useState<string>(() => {
    // "≈ all in base" only when every currency can be converted; else the base currency.
    const used = flowCurrencies(rows);
    const convertible = used.every((c) => c === base || rates[c]);
    if (used.length > 1 && convertible) return APPROX;
    return used.includes(base) || !used.length ? base : used[0]!;
  });
  const [table, setTable] = useState(false);

  const data = useMemo(
    () => analyze(rows, { totalMonths: months.length, months: range, currency, base, rates }),
    [rows, months.length, range, currency, base, rates],
  );
  const target = data.target;
  const money = (minor: number, compact = false) =>
    formatMoneySigned(minor, target, locale, { compact });
  const approxPrefix = currency === APPROX ? "≈ " : "";

  const series = data.series.map((s) => ({
    i: s.m,
    income: s.income,
    expense: s.expense,
  }));
  const hasData = data.income > 0 || data.expense > 0;

  // Donut: top 5 categories + "Other".
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const topCats = data.byCategory.slice(0, 5).map((c) => ({
    id: c.id || "none",
    name: c.id ? (catMap.get(c.id)?.name ?? "—") : f.uncategorized,
    color: c.id ? (catMap.get(c.id)?.color ?? OTHER_COLOR) : OTHER_COLOR,
    value: c.value,
  }));
  const rest = data.byCategory.slice(5).reduce((s, c) => s + c.value, 0);
  if (rest > 0) topCats.push({ id: "other", name: f.other, color: OTHER_COLOR, value: rest });
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const topClients = data.byClient.slice(0, 6);
  const maxClient = topClients[0]?.value ?? 0;

  const chartConfig = {
    income: { label: f.colIncome },
    expense: { label: f.colExpense },
  } satisfies ChartConfig;

  const tick = (v: number) =>
    formatNumber(minorToMajor(v, target), locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    });

  return (
    <FrameBox as="div" density="compact">
      <FrameGrid cols={1}>
        <FrameCell className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
          <span className="text-sm font-semibold text-muted-foreground">{f.rangeLabel}</span>
          <ToggleGroup
            type="single"
            value={String(range)}
            onValueChange={(v) => v && setRange(Number(v) as 6 | 12)}
            aria-label={f.rangeLabel}
            className={TOGGLE_CHIPS}
          >
            <ToggleGroupItem value="6" className={TOGGLE_CHIP}>
              {f.range6}
            </ToggleGroupItem>
            <ToggleGroupItem value="12" className={TOGGLE_CHIP}>
              {f.range12}
            </ToggleGroupItem>
          </ToggleGroup>
          <span className="text-sm font-semibold text-muted-foreground sm:ms-3">
            {f.currencyLabel}
          </span>
          <SelectField
            value={currency}
            onChange={setCurrency}
            className="w-auto min-w-40"
            size="sm"
            options={[
              ...(currencies.length > 1
                ? [{ value: APPROX, label: format(f.allInBase, { currency: base }) }]
                : []),
              ...currencies.map((c) => ({
                value: c,
                label: <span className="font-mono">{c}</span>,
              })),
            ]}
          />
          {data.missing.length > 0 && (
            <span className="text-xs text-[#b76e00] dark:text-[#ffd666]">
              {format(f.missingRates, { list: data.missing.join(locale === "fa" ? "، " : ", ") })}
            </span>
          )}
        </FrameCell>
      </FrameGrid>

      <FrameGrid cols="2-1">
        <BoxCell
          title={f.cashflow}
          titleId="fin-cashflow"
          description={f.cashflowHint}
          flush
          action={
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTable((v) => !v)}
              aria-label={table ? f.chartView : f.tableView}
              aria-pressed={table}
            >
              {table ? <BarChart3Icon /> : <TableIcon />}
            </Button>
          }
        >
          {/* Period totals: a nested row of cells sharing the box's hairlines. */}
          <FrameGrid as="dl" cols={1} className="sm:grid-cols-3">
            {(
              [
                ["income", f.periodIncome, data.income],
                ["expense", f.periodExpense, data.expense],
                ["net", f.periodNet, data.net],
              ] as const
            ).map(([key, label, value]) => (
              <FrameCell
                key={key}
                className="flex min-w-0 items-center justify-between gap-3 py-3 sm:block"
              >
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {key !== "net" && (
                    <span
                      aria-hidden
                      className={cn("size-2.5", seriesVars)}
                      style={{ backgroundColor: `var(--color-${key})` }}
                    />
                  )}
                  {label}
                </dt>
                <dd
                  className="truncate text-base font-extrabold tabular-nums sm:mt-1 sm:text-lg"
                  title={money(value)}
                >
                  {approxPrefix}
                  {money(value, true)}
                </dd>
              </FrameCell>
            ))}
          </FrameGrid>

          {!hasData ? (
            <p className="px-(--cell-pad) py-16 text-center text-sm text-muted-foreground">
              {f.noChartData}
            </p>
          ) : table ? (
            <div className="max-h-72 scrollbar-thin overflow-auto border-b border-frame-line">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead>{f.month}</TableHead>
                    <TableHead className="text-end">{f.colIncome}</TableHead>
                    <TableHead className="text-end">{f.colExpense}</TableHead>
                    <TableHead className="text-end">{f.colNet}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular-nums">
                  {[...series].reverse().map((s) => (
                    <TableRow key={s.i}>
                      <TableCell>{months[s.i]?.full}</TableCell>
                      <TableCell className="text-end">{money(s.income)}</TableCell>
                      <TableCell className="text-end">{money(s.expense)}</TableCell>
                      <TableCell className="text-end font-semibold">
                        {money(s.income - s.expense)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3 p-(--cell-pad)">
              <ChartContainer
                config={chartConfig}
                className={cn("aspect-auto h-64 w-full", seriesVars)}
                aria-label={f.cashflow}
              >
                <BarChart data={series} barGap={2} barCategoryGap="30%" accessibilityLayer>
                  <CartesianGrid vertical={false} stroke="var(--frame-line)" />
                  <XAxis
                    dataKey="i"
                    tickLine={false}
                    axisLine={{ stroke: "var(--frame-line)" }}
                    tickMargin={8}
                    reversed={dir === "rtl"}
                    tickFormatter={(i: number) => months[i]?.label ?? ""}
                  />
                  <YAxis
                    orientation={dir === "rtl" ? "right" : "left"}
                    tickLine={false}
                    axisLine={false}
                    width={locale === "fa" ? 64 : 52}
                    tickFormatter={tick}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(i) => months[Number(i)]?.full ?? ""}
                        formatter={(v) => `${approxPrefix}${money(Number(v))}`}
                      />
                    }
                  />
                  {(dir === "rtl"
                    ? (["expense", "income"] as const)
                    : (["income", "expense"] as const)
                  ).map((k) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      fill={`var(--color-${k})`}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={22}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
              <div
                className={cn(
                  "flex items-center justify-center gap-5 text-xs text-muted-foreground",
                  seriesVars,
                )}
              >
                {(["income", "expense"] as const).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2.5"
                      style={{ backgroundColor: `var(--color-${k})` }}
                    />
                    {chartConfig[k].label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </BoxCell>

        {aside}
      </FrameGrid>

      <FrameGrid cols={3}>
        <BoxCell
          title={f.byCategory}
          titleId="fin-categories"
          description={
            <span className="tabular-nums">
              {approxPrefix}
              {money(data.expense)}
            </span>
          }
        >
          {topCats.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{f.noChartData}</p>
          ) : (
            <div className="space-y-4">
              <ChartContainer
                config={{}}
                className="mx-auto aspect-square h-44"
                aria-label={f.byCategory}
              >
                <PieChart>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as (typeof topCats)[number] | undefined;
                      if (!active || !p) return null;
                      return (
                        <div className="grid gap-1 rounded-xl border bg-popover/95 px-3 py-2 text-xs shadow-dropdown">
                          <span className="font-bold">{p.name}</span>
                          <span className="font-mono">
                            {approxPrefix}
                            {money(p.value)}
                          </span>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={topCats}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={topCats.length > 1 ? 2 : 0}
                    stroke="var(--background)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {topCats.map((c) => (
                      <Cell key={c.id} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              {/* The value legend under a hairline (identity is never colour-only). */}
              <ul className="divide-y divide-dashed divide-frame-line border-t border-frame-line text-sm">
                {topCats.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 py-2 last:pb-0">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatNumber(data.expense ? c.value / data.expense : 0, locale, {
                        style: "percent",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="shrink-0 text-end font-semibold whitespace-nowrap tabular-nums">
                      {money(c.value, true)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </BoxCell>

        <BoxCell
          title={f.topClients}
          titleId="fin-clients"
          description={
            <span className="tabular-nums">
              {approxPrefix}
              {money(data.income)}
            </span>
          }
        >
          {topClients.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{f.noChartData}</p>
          ) : (
            <ul className="space-y-4">
              {topClients.map((c) => {
                const cl = clientMap.get(c.id);
                return (
                  <li key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold">{cl?.name ?? "—"}</span>
                      <span className="shrink-0 font-bold tabular-nums">
                        {approxPrefix}
                        {money(c.value, true)}
                      </span>
                    </div>
                    {/* A square hairline track (frame bars are square). */}
                    <div className="h-2 border border-frame-line bg-card">
                      <div
                        className={cn("h-full", seriesVars)}
                        style={{
                          width: `${Math.max(3, (c.value / maxClient) * 100)}%`,
                          backgroundColor: "var(--color-income)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </BoxCell>

        {receivables}
      </FrameGrid>
    </FrameBox>
  );
}
