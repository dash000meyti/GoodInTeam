import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FrameCell, FrameFiller, FrameGrid, FrameSection, type GuideLine } from "./frame";
import { packRows } from "./frame-plan";

/** Skeletons that mirror the final layouts (same boxes/aspect ratios → no CLS). */

/** The inside of a card cell (`variant="cell"`): cover, chip, title, two lines. */
export function CellCardSkeleton({ cover = true }: { cover?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {cover && <Skeleton className="aspect-[16/10] w-full rounded-[8px]" />}
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/** A FrameGrid 3 of `count` skeleton card cells plus trailing fillers. */
export function CellGridSkeleton({ count = 6, cover = true }: { count?: number; cover?: boolean }) {
  const spans = Array.from({ length: count }, () => undefined);
  return (
    <FrameGrid cols={3}>
      {spans.map((_, i) => (
        <FrameCell key={i}>
          <CellCardSkeleton cover={cover} />
        </FrameCell>
      ))}
      <FrameFiller
        units={{ md: packRows(spans, 3, "md").trailing, lg: packRows(spans, 3, "lg").trailing }}
      />
    </FrameGrid>
  );
}

/** A FrameGrid 1 row of chip skeletons (filter rows). */
export function ChipRowSkeleton({ rows = [5] }: { rows?: number[] }) {
  return (
    <FrameGrid cols={1}>
      <FrameCell className="flex flex-col gap-3 py-5 md:py-5">
        {rows.map((count, r) => (
          <ChipsSkeleton key={r} count={count} />
        ))}
      </FrameCell>
    </FrameGrid>
  );
}

/**
 * Detail pages (post, lesson, case study, service) while their data streams:
 * the same first box (FrameGrid 2-1 of a header cell and the decor end cell)
 * and a body box, so the page doesn't jump when it lands.
 */
export function ArticleSkeleton({ guide }: { guide?: GuideLine }) {
  return (
    <>
      <FrameSection first guide={guide} strip={{ index: 1 }}>
        <FrameGrid cols="2-1">
          <FrameCell header className="flex flex-col gap-5 lg:min-h-[240px]">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-3/4" />
            <Skeleton className="h-4 w-64" />
          </FrameCell>
          <FrameCell tone="dots" className="hidden lg:block" />
        </FrameGrid>
      </FrameSection>
      <FrameSection strip={{ index: 2 }}>
        <FrameGrid cols="2-1">
          <FrameCell className="space-y-3">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
            ))}
          </FrameCell>
          <FrameCell className="hidden lg:block">
            <Skeleton className="h-4 w-24" />
          </FrameCell>
        </FrameGrid>
      </FrameSection>
    </>
  );
}

export function ChipsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-[6px]" />
      ))}
    </div>
  );
}
