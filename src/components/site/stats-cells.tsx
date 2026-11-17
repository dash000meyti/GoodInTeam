import "server-only";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getSiteStats } from "@/server/modules/content/queries";
import { FrameCell, FrameGrid } from "./frame";
import { fmtNum } from "./ui";

/**
 * The stats row (spec §8 row 07, reused by /about): the complete
 * `FrameGrid cols={4}` with four cells and NO box — the caller owns the
 * FrameSection and wraps this in `<Suspense fallback={<StatsCellsSkeleton/>}>`.
 * Alternate cells are `tone="card"` (never dots behind text).
 */
export async function StatsCells({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const s = await getSiteStats();
  const items = [
    { v: s.projectsDelivered, label: t.site.statProjects },
    { v: s.hoursTracked, label: t.site.statHours },
    { v: s.clients, label: t.site.statClients },
    { v: s.postsPublished, label: t.site.statPosts },
  ];
  return (
    <FrameGrid cols={4} as="dl">
      {items.map((it, i) => (
        <FrameCell
          key={it.label}
          tone={i % 2 ? "card" : "default"}
          className="flex flex-col-reverse items-start gap-2"
        >
          <dt className="text-sm leading-5 text-muted-foreground">{it.label}</dt>
          <dd className="text-[48px] leading-none font-bold tabular-nums [:lang(en)_&]:tracking-[-0.03em] [:lang(fa)_&]:font-extrabold">
            {fmtNum(it.v, locale)}
            <span className="text-primary-ink">+</span>
          </dd>
        </FrameCell>
      ))}
    </FrameGrid>
  );
}

/** Same grid, same cells, same heights. */
export function StatsCellsSkeleton() {
  return (
    <FrameGrid cols={4}>
      {Array.from({ length: 4 }, (_, i) => (
        <FrameCell
          key={i}
          tone={i % 2 ? "card" : "default"}
          className="flex flex-col-reverse items-start gap-2"
        >
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-12 w-24" />
        </FrameCell>
      ))}
    </FrameGrid>
  );
}
