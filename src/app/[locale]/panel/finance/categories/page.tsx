import Link from "next/link";
import { ArrowDownLeftIcon, ArrowUpRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/panel/page-header";
import { MoneyStack } from "@/components/finance/money";
import { format } from "@/i18n/format-message";
import { formatNumber } from "@/lib/format";
import { baseCurrency } from "@/server/modules/finance/internal";
import { listCategories } from "@/server/modules/finance/service";
import { panelContext } from "@/server/page-context";
import { CategoryActions, CategoryFormDialog } from "../_components/category-form";
import { FinanceNav } from "../_components/finance-nav";

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
      />
      <FinanceNav active="categories" href={href} t={f} />
      <div className="grid gap-6 lg:grid-cols-2">
        {(["income", "expense"] as const).map((kind) => {
          const rows = list.filter((c) => c.kind === kind);
          const Icon = kind === "income" ? ArrowDownLeftIcon : ArrowUpRightIcon;
          return (
            <Card key={kind} className="gap-0 pb-2">
              <CardHeader className="border-b border-dashed pb-5">
                <CardTitle className="flex items-center gap-2">
                  <span
                    className={
                      kind === "income"
                        ? "flex size-8 items-center justify-center rounded-lg bg-success/14 text-[#118d57] dark:text-[#77ed8b]"
                        : "flex size-8 items-center justify-center rounded-lg bg-destructive/12 text-[#b71d18] dark:text-[#ffac82]"
                    }
                  >
                    <Icon className="size-4 rtl:-scale-x-100" />
                  </span>
                  {kind === "income" ? f.incomeCategories : f.expenseCategories}
                </CardTitle>
                <CardAction>
                  <CategoryFormDialog
                    defaultKind={kind}
                    trigger={
                      <Button variant="soft" size="sm">
                        <PlusIcon /> {t.common.add}
                      </Button>
                    }
                  />
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                {rows.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                    {f.categoriesEmpty}
                  </p>
                ) : (
                  <ul className="divide-y divide-dashed">
                    {rows.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 px-6 py-3">
                        <span
                          aria-hidden
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: c.color ?? "var(--muted-foreground)" }}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={href(`/panel/finance/transactions?categoryId=${c.id}`)}
                            className="block truncate font-semibold hover:text-primary"
                          >
                            {c.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
