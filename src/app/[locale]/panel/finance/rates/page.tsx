import { CoinsIcon, InfoIcon, PlusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { format } from "@/i18n/format-message";
import { formatDate, formatNumber } from "@/lib/format";
import { currencies, isCurrency } from "@/lib/money";
import { toDateInputValue } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { listFxRates } from "@/server/modules/finance/fx";
import { panelContext } from "@/server/page-context";
import { FinanceNav } from "../_components/finance-nav";
import { RateActions, RateFormDialog } from "../_components/rate-form";

export default async function RatesPage() {
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, locale, fmt, tz } = ctx;
  const f = t.finance;
  const { base, rows } = listFxRates(actor);
  const baseSymbol = isCurrency(base) ? currencies[base].symbol[locale] : base;

  // Latest + previous per currency (rows are newest first).
  const latest = new Map<string, { rate: number; date: Date; prev: number | null }>();
  for (const r of rows) {
    const cur = latest.get(r.currency);
    if (!cur) latest.set(r.currency, { rate: r.rate, date: r.date, prev: null });
    else if (cur.prev == null) cur.prev = r.rate;
  }
  const num = (n: number) => formatNumber(n, locale, { maximumFractionDigits: n < 10 ? 4 : 0 });

  const addButton = (
    <RateFormDialog
      base={base}
      trigger={
        <Button>
          <PlusIcon /> {f.newRate}
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title={f.ratesTitle}
        description={format(f.ratesSubtitle, { base: baseSymbol })}
        crumbs={[{ label: f.title, href: href("/panel/finance") }, { label: f.ratesTitle }]}
        actions={addButton}
      />
      <FinanceNav active="rates" href={href} t={f} />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-info" />
        <p>
          <b className="text-foreground">
            {f.baseCurrency}: {base} ({baseSymbol})
          </b>{" "}
          — {f.baseHint}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CoinsIcon}
          title={f.ratesEmpty}
          description={format(f.ratesEmptyHint, { base: baseSymbol })}
          action={addButton}
        />
      ) : (
        <>
          <h2 className="mb-3 text-sm font-bold text-muted-foreground">{f.latestRates}</h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...latest.entries()].map(([currency, r]) => {
              const change = r.prev ? ((r.rate - r.prev) / r.prev) * 100 : null;
              return (
                <Card key={currency} className="gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="neutral" className="font-mono text-sm">
                      {currency}
                    </Badge>
                    {change != null && change !== 0 && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-bold",
                          change > 0
                            ? "text-[#118d57] dark:text-[#77ed8b]"
                            : "text-[#b71d18] dark:text-[#ffac82]",
                        )}
                      >
                        {change > 0 ? (
                          <TrendingUpIcon className="size-3.5" />
                        ) : (
                          <TrendingDownIcon className="size-3.5" />
                        )}
                        {formatNumber(Math.abs(change) / 100, locale, {
                          style: "percent",
                          maximumFractionDigits: 1,
                        })}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{format(f.rateFor, { currency })}</p>
                    <p className="text-2xl font-extrabold tracking-tight tabular-nums">
                      {num(r.rate)} <span className="text-base font-bold">{baseSymbol}</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(f.updatedOn, { date: formatDate(r.date, fmt) })}
                  </p>
                </Card>
              );
            })}
          </div>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b border-dashed py-5">
              <CardTitle>{f.history}</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{f.rateDate}</TableHead>
                  <TableHead>{t.common.currency}</TableHead>
                  <TableHead className="text-end">{f.rate}</TableHead>
                  <TableHead className="w-20">
                    <span className="sr-only">{t.common.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.date, fmt)}</TableCell>
                    <TableCell>
                      <Badge variant="neutral" className="font-mono">
                        {r.currency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">
                      {num(r.rate)} {baseSymbol}
                    </TableCell>
                    <TableCell>
                      <RateActions
                        base={base}
                        rate={{
                          id: r.id,
                          currency: r.currency,
                          rate: String(r.rate),
                          date: toDateInputValue(r.date, tz),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
