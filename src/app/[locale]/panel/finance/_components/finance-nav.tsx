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
import { FrameCell, FrameGrid } from "@/components/shell/frame";
import type { Messages } from "@/i18n/messages";
import { CHIP_ROW, chipClass } from "./frame-bits";

export type FinanceSection =
  "overview" | "transactions" | "accounts" | "categories" | "ledgers" | "rates";

const items: { key: FinanceSection; path: string; icon: LucideIcon }[] = [
  { key: "overview", path: "/panel/finance", icon: ChartPieIcon },
  { key: "transactions", path: "/panel/finance/transactions", icon: ArrowLeftRightIcon },
  { key: "accounts", path: "/panel/finance/accounts", icon: LandmarkIcon },
  { key: "categories", path: "/panel/finance/categories", icon: TagsIcon },
  { key: "ledgers", path: "/panel/finance/ledgers", icon: BookUserIcon },
  { key: "rates", path: "/panel/finance/rates", icon: CoinsIcon },
];

/**
 * Finance sub-navigation: a row of the page box (`<PageHeader>{<FinanceNav/>}</PageHeader>`)
 * holding the site's chips, the current section filled with ink; the row
 * scrolls inside its cell on small screens.
 */
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
    <FrameGrid cols={1}>
      <FrameCell className="py-3">
        <nav aria-label={t.title} className={CHIP_ROW}>
          {items.map((item) => {
            const Icon = item.icon;
            const on = item.key === active;
            return (
              <Link
                key={item.key}
                href={href(item.path)}
                aria-current={on ? "page" : undefined}
                className={chipClass(on)}
              >
                <Icon />
                {t[`nav_${item.key}`]}
              </Link>
            );
          })}
        </nav>
      </FrameCell>
    </FrameGrid>
  );
}
