import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorDot } from "@/components/shared/color-dot";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameGrid } from "@/components/shell/frame";
import { MoneyStack } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatNumber } from "@/lib/format";
import { baseCurrency } from "@/server/modules/finance/internal";
import { listCategories } from "@/server/modules/finance/service";
import { panelContext } from "@/server/page-context";
import { CategoryActions, CategoryFormDialog } from "../_components/category-form";
import { FinanceNav } from "../_components/finance-nav";
import { BoxCell, FLUSH_LIST } from "../_components/frame-bits";
import { KindIcon } from "../_components/transaction-list";

/**
 * Categories (framed): the page box carries the finance nav; income and
 * expense categories are two cells of one box (side by side from lg), each a
 * header row over an edge-to-edge row list; the shorter list ends in dots.
 */
export default async function CategoriesPage() {
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, locale, now } = ctx;
  const f = t.finance;
  const list = listCategories(actor, { now, locale });
  const base = baseCurrency();

  return (
    <>
      <PageHeader
        title={f.categoriesTitle}
        description={f.categoriesSubtitle}
        crumbs={[{ label: f.title, href: href("/panel/finance") }, { label: f.categoriesTitle }]}
        actions={
          <CategoryFormDialog
            trigger={
              <Button>
                <PlusIcon /> {f.newCategory}
              </Button>
            }
          />
        }
      >
        <FinanceNav active="categories" href={href} t={f} />
      </PageHeader>

      <FrameBox as="div" density="compact">
        <FrameGrid cols={1} className="lg:grid-cols-2">
          {(["income", "expense"] as const).map((kind) => {
            const rows = list.filter((c) => c.kind === kind);
            return (
              <BoxCell
                key={kind}
                title={kind === "income" ? f.incomeCategories : f.expenseCategories}
                titleId={`cat-${kind}`}
                icon={<KindIcon kind={kind} className="size-8" />}
                flush
                action={
                  <CategoryFormDialog
                    defaultKind={kind}
                    trigger={
                      <Button variant="soft" size="sm">
                        <PlusIcon /> {t.common.add}
                      </Button>
                    }
                  />
                }
              >
                {rows.length === 0 ? (
                  <p className="px-(--cell-pad) py-10 text-center text-sm text-muted-foreground">
                    {f.categoriesEmpty}
                  </p>
                ) : (
                  <ul className={FLUSH_LIST}>
                    {rows.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-3 px-(--cell-pad) py-3 transition-colors hover:bg-card"
                      >
                        <ColorDot color={c.color} />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={href(`/panel/finance/transactions?categoryId=${c.id}`)}
                            className="block truncate font-semibold hover:text-primary-ink"
                          >
                            {c.name}
                          </Link>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {format(f.txCount, { n: formatNumber(c.txCount, locale) })}
                          </span>
                        </div>
                        <div className="text-end text-sm">
                          <p className="text-[11px] text-muted-foreground">{f.thisMonthTotal}</p>
                          <MoneyStack
                            rows={c.month}
                            locale={locale}
                            base={base}
                            compact
                            className="font-bold"
                          />
                        </div>
                        <CategoryActions
                          category={{ id: c.id, name: c.name, kind: c.kind, color: c.color }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </BoxCell>
            );
          })}
        </FrameGrid>
      </FrameBox>
    </>
  );
}
