import { PageHeaderSkeleton, StatRowSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the framed commitments page: page box + KPI row, then the quick-add / groups box. */
export default function Loading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <StatRowSkeleton />
      </PageHeaderSkeleton>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell className="grid gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-none" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:items-end xl:grid-cols-[minmax(0,1fr)_12rem_11rem_7rem_9rem]">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className={i === 0 ? "grid gap-1.5 md:col-span-2 xl:col-span-1" : "grid gap-1.5"}
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>
              ))}
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1} className="xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <FrameCell pad="none" className="divide-y divide-frame-line">
            {[0, 1].map((g) => (
              <div key={g}>
                <div className="flex min-h-13 items-center gap-3 px-(--cell-pad)">
                  <Skeleton className="size-8 rounded-none" />
                  <Skeleton className="h-5 w-32" />
                </div>
                {[0, 1].map((r) => (
                  <div
                    key={r}
                    className="space-y-2 border-t border-frame-line px-(--cell-pad) py-4"
                  >
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ))}
          </FrameCell>
          <FrameCell pad="none">
            <div className="flex min-h-13 items-center border-b border-frame-line px-(--cell-pad)">
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="space-y-4 p-(--cell-pad)">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
