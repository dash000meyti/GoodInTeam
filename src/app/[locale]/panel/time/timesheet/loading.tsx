import { PageHeaderSkeleton, StatRowSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the framed timesheet: page box + KPI row, then the grid box (head row + rows). */
export default function TimesheetLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <StatRowSkeleton />
      </PageHeaderSkeleton>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            {Array.from({ length: 5 }, (_, r) => (
              <div
                key={r}
                className="grid h-12 grid-cols-[9rem_repeat(7,minmax(0,1fr))_6rem] items-center border-b border-frame-line last:border-b-0 sm:grid-cols-[14rem_repeat(7,minmax(0,1fr))_6rem]"
              >
                <Skeleton className="mx-(--cell-pad) h-4 max-w-24" />
                {Array.from({ length: 8 }, (_, c) => (
                  <Skeleton key={c} className="mx-auto h-3.5 w-3/5 max-w-8" />
                ))}
              </div>
            ))}
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
