import Link from "next/link";
import { LayersIcon, MessageSquareQuoteIcon, NewspaperIcon } from "lucide-react";
import { FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";

/**
 * The site's filter chip at panel size (32px, 6px corners, hairline; the
 * active one filled with ink) — like the invoices status chips.
 */
const chip = (on: boolean) =>
  cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold whitespace-nowrap transition-colors",
    on
      ? "border-foreground bg-foreground text-background"
      : "border-frame-line bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
  );

/**
 * Sub-navigation of the CMS (posts · courses · testimonials): a chip row of
 * the page box (pass it as a PageHeader child, before the stats row).
 */
export function ContentNav({
  active,
  href,
  t,
}: {
  active: "posts" | "series" | "testimonials";
  href: (p: string) => string;
  t: Messages;
}) {
  const items = [
    { key: "posts", label: t.content.posts, path: "/panel/content", icon: NewspaperIcon },
    {
      key: "series",
      label: t.content.seriesTitle,
      path: "/panel/content/series",
      icon: LayersIcon,
    },
    {
      key: "testimonials",
      label: t.content.testimonialsTitle,
      path: "/panel/content/testimonials",
      icon: MessageSquareQuoteIcon,
    },
  ] as const;
  return (
    <FrameGrid cols={1}>
      <FrameCell className="py-3">
        <nav
          aria-label={t.nav.content}
          className="-mx-1 flex max-w-[calc(100%+0.5rem)] scrollbar-thin gap-1.5 overflow-x-auto px-1 py-0.5"
        >
          {items.map((it) => {
            const on = active === it.key;
            return (
              <Link
                key={it.key}
                href={href(it.path)}
                aria-current={on ? "page" : undefined}
                className={chip(on)}
              >
                <it.icon className="size-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </FrameCell>
    </FrameGrid>
  );
}

/** ContentNav's row while the page streams: same height. */
export function ChipRowSkeleton({ chips = 3 }: { chips?: number }) {
  return (
    <FrameGrid cols={1}>
      <FrameCell className="py-3">
        <div className="flex gap-1.5 overflow-hidden py-0.5">
          {Array.from({ length: chips }, (_, i) => (
            <Skeleton key={i} className="h-8 w-28 shrink-0 rounded-[6px]" />
          ))}
        </div>
      </FrameCell>
    </FrameGrid>
  );
}
