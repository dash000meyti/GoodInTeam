import { BoxSkeleton, PageHeaderSkeleton, StatRowSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the framed reports page: page box + filter row + KPI row, charts box, table box. */
export default function ReportsLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <FrameGrid cols={1}>
          <FrameCell className="py-3">
            <div className="flex gap-1.5 overflow-hidden py-0.5">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-[6px]" />
              ))}
            </div>
          </FrameCell>
        </FrameGrid>
        <StatRowSkeleton />
      </PageHeaderSkeleton>
      <div className="flex flex-col gap-6 lg:gap-8">
        <FrameBox as="div" density="compact">
          <FrameGrid cols="2-1">
            {[0, 1].map((i) => (
              <FrameCell key={i} pad="none">
                <div className="flex min-h-13 items-center border-b border-frame-line px-(--cell-pad)">
                  <Skeleton className="h-5 w-36" />
                </div>
                <div className="p-(--cell-pad)">
                  <Skeleton className="h-72 w-full" />
                </div>
              </FrameCell>
            ))}
          </FrameGrid>
        </FrameBox>
        <BoxSkeleton height={200} header />
      </div>
    </div>
  );
}
