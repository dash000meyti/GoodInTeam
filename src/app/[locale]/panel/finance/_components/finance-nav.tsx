import Link from "next/link";
import {
  ArrowLeftRightIcon,
  BookUserIcon,
  ChartPieIcon,
  CoinsIcon,
  LandmarkIcon,
  TagsIcon,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";

export type FinanceSection = "overview" | "transactions" | "accounts" | "categories" | "ledgers" | "rates";

const items: { key: FinanceSection; path: string; icon: LucideIcon }[] = [
  { key: "overview", path: "/panel/finance", icon: ChartPieIcon },
  { key: "transactions", path: "/panel/finance/transactions", icon: ArrowLeftRightIcon },
  { key: "accounts", path: "/panel/finance/accounts", icon: LandmarkIcon },
  { key: "categories", path: "/panel/finance/categories", icon: TagsIcon },
  { key: "ledgers", path: "/panel/finance/ledgers", icon: BookUserIcon },
  { key: "rates", path: "/panel/finance/rates", icon: CoinsIcon },
];

/** Finance sub-navigation (segmented pills; scrolls horizontally on small screens). */
export function FinanceNav({
  active,
  href,
  t,
}: {
  active: FinanceSection;
  href: (path: string) => string;
  t: Messages["finance"];
}) {
  return (
    <nav
      aria-label={t.title}
      className="-mt-3 mb-8 flex max-w-full scrollbar-thin gap-1 overflow-x-auto rounded-xl bg-muted p-1 sm:w-fit"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const on = item.key === active;
        return (
          <Link
            key={item.key}
            href={href(item.path)}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              on && "bg-background text-foreground shadow-card dark:bg-card",
            )}
          >
            <Icon className="size-4" />
            {t[`nav_${item.key}`]}
          </Link>
        );
      })}
    </nav>
  );
}
