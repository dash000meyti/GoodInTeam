import { CoinsIcon, InfoIcon, PlusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { STAT_VALUE_CLASS, StatRow } from "@/components/panel/stat-card";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { format } from "@/i18n/format-message";
import { formatDate, formatNumber } from "@/lib/format";
import { currencies, isCurrency } from "@/lib/money";
import { toDateInputValue } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { listFxRates } from "@/server/modules/finance/fx";
import { panelContext } from "@/server/page-context";
import { FinanceNav } from "../_components/finance-nav";
import { BoxCell } from "../_components/frame-bits";
import { RateActions, RateFormDialog } from "../_components/rate-form";

/**
 * FX rates (framed): the page box carries the finance nav and the base
 * currency note as rows; one box holds the latest rate per currency (a row
 * of cells sharing hairlines) over the edge-to-edge rate history.
 */
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
      >
        <FinanceNav active="rates" href={href} t={f} />
        <FrameGrid cols={1}>
          <FrameCell className="flex items-start gap-3 py-3 text-sm text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-info-ink" />
            <p>
              <b className="text-foreground">
                {f.baseCurrency}: {base} ({baseSymbol})
              </b>{" "}
              — {f.baseHint}
            </p>
          </FrameCell>
        </FrameGrid>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={CoinsIcon}
          title={f.ratesEmpty}
          description={format(f.ratesEmptyHint, { base: baseSymbol })}
          action={addButton}
        />
      ) : (
        <FrameBox as="div" density="compact">
          <FrameGrid cols={1}>
            <BoxCell title={f.latestRates} titleId="fx-latest" flush>
              <StatRow>
                {[...latest.entries()].map(([currency, r]) => {
                  const change = r.prev ? ((r.rate - r.prev) / r.prev) * 100 : null;
                  return (
                    <FrameCell key={currency} className="flex min-w-0 flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="neutral" className="font-mono text-sm">
                          {currency}
                        </Badge>
                        {change != null && change !== 0 && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs font-bold tabular-nums",
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
                        <p className="text-xs text-muted-foreground">
                          {format(f.rateFor, { currency })}
                        </p>
                        <p className={STAT_VALUE_CLASS}>
                          {num(r.rate)} <span className="text-base font-bold">{baseSymbol}</span>
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(f.updatedOn, { date: formatDate(r.date, fmt) })}
                      </p>
                    </FrameCell>
                  );
                })}
              </StatRow>
            </BoxCell>
          </FrameGrid>
          <FrameGrid cols={1}>
            <BoxCell title={f.history} titleId="fx-history" flush>
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
            </BoxCell>
          </FrameGrid>
        </FrameBox>
      )}
    </>
  );
}
