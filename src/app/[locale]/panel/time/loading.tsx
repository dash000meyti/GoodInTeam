import { BoxSkeleton, PageHeaderSkeleton, StatRowSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the framed Time page: page box + KPI row, tracker box, timeline box. */
export default function TimeLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <StatRowSkeleton />
      </PageHeaderSkeleton>
      <div className="flex flex-col gap-6 lg:gap-8">
        <FrameBox as="div" density="compact">
          <FrameGrid cols={1}>
            <FrameCell className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Skeleton className="h-12 flex-1 rounded-lg" />
              <div className="grid grid-cols-2 gap-3 sm:flex">
                <Skeleton className="h-12 rounded-lg sm:w-52" />
                <Skeleton className="h-12 rounded-lg sm:w-48" />
              </div>
              <Skeleton className="h-12 rounded-xl lg:w-40" />
            </FrameCell>
          </FrameGrid>
        </FrameBox>
        <BoxSkeleton height={240} />
      </div>
    </div>
  );
}
