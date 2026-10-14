"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BarChart3Icon, TableIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SelectField } from "@/components/shared/select-field";
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
 * Overview analytics: cash flow per month, expenses by category, top clients.
 * One filter row (range + currency) scopes every chart; switching is instant
 * (all data for 12 months is preloaded as compact aggregated rows).
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
  aside: ReactNode;
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">{f.rangeLabel}</span>
        <ToggleGroup
          type="single"
          value={String(range)}
          onValueChange={(v) => v && setRange(Number(v) as 6 | 12)}
          aria-label={f.rangeLabel}
        >
          <ToggleGroupItem value="6">{f.range6}</ToggleGroupItem>
          <ToggleGroupItem value="12">{f.range12}</ToggleGroupItem>
        </ToggleGroup>
        <span className="ms-2 text-sm font-semibold text-muted-foreground">{f.currencyLabel}</span>
        <SelectField
          value={currency}
          onChange={setCurrency}
          className="w-auto min-w-40"
          size="sm"
          options={[
            ...(currencies.length > 1
              ? [{ value: APPROX, label: format(f.allInBase, { currency: base }) }]
              : []),
            ...currencies.map((c) => ({ value: c, label: <span className="font-mono">{c}</span> })),
          ]}
        />
        {data.missing.length > 0 && (
          <span className="text-xs text-[#b76e00] dark:text-[#ffd666]">
            {format(f.missingRates, { list: data.missing.join(locale === "fa" ? "، " : ", ") })}
          </span>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{f.cashflow}</CardTitle>
            <CardDescription>{f.cashflowHint}</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setTable((v) => !v)}
                aria-label={table ? f.chartView : f.tableView}
                aria-pressed={table}
              >
                {table ? <BarChart3Icon /> : <TableIcon />}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              {(
                [
                  ["income", f.periodIncome, data.income],
                  ["expense", f.periodExpense, data.expense],
                  ["net", f.periodNet, data.net],
                ] as const
              ).map(([key, label, value]) => (
                <div
                  key={key}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5 sm:block sm:p-3"
                >
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    {key !== "net" && (
                      <span
                        aria-hidden
                        className={cn("size-2.5 rounded-[3px]", seriesVars)}
                        style={{ backgroundColor: `var(--color-${key})` }}
                      />
                    )}
                    {label}
                  </dt>
                  <dd
                    className="truncate text-base font-extrabold sm:mt-1 sm:text-lg"
                    title={money(value)}
                  >
                    {approxPrefix}
                    {money(value, true)}
                  </dd>
                </div>
              ))}
            </dl>

            {!hasData ? (
              <p className="py-16 text-center text-sm text-muted-foreground">{f.noChartData}</p>
            ) : table ? (
              <div className="max-h-72 scrollbar-thin overflow-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="p-2 text-start font-semibold">{f.month}</th>
                      <th className="p-2 text-end font-semibold">{f.colIncome}</th>
                      <th className="p-2 text-end font-semibold">{f.colExpense}</th>
                      <th className="p-2 text-end font-semibold">{f.colNet}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {[...series].reverse().map((s) => (
                      <tr key={s.i} className="border-t border-dashed">
                        <td className="p-2">{months[s.i]?.full}</td>
                        <td className="p-2 text-end">{money(s.income)}</td>
                        <td className="p-2 text-end">{money(s.expense)}</td>
                        <td className="p-2 text-end font-semibold">
                          {money(s.income - s.expense)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <ChartContainer
                  config={chartConfig}
                  className={cn("aspect-auto h-64 w-full", seriesVars)}
                  aria-label={f.cashflow}
                >
                  <BarChart data={series} barGap={2} barCategoryGap="30%" accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="i"
                      tickLine={false}
                      axisLine={false}
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
                        className="size-2.5 rounded-[3px]"
                        style={{ backgroundColor: `var(--color-${k})` }}
                      />
                      {chartConfig[k].label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {aside}

        <Card>
          <CardHeader>
            <CardTitle>{f.byCategory}</CardTitle>
            <CardDescription>
              {approxPrefix}
              {money(data.expense)}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      stroke="var(--card)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {topCats.map((c) => (
                        <Cell key={c.id} fill={c.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="space-y-2 text-sm">
                  {topCats.map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-[3px]"
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{f.topClients}</CardTitle>
            <CardDescription>
              {approxPrefix}
              {money(data.income)}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", seriesVars)}
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
          </CardContent>
        </Card>

        {receivables}
      </div>
    </div>
  );
}
