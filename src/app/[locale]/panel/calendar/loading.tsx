import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Calendar-shaped skeleton while the page streams in: the page box, then the
 * calendar box (toolbar and source rows, the month grid; the side cell from xl).
 */
export default function Loading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1} className="xl:grid-cols-[minmax(0,1fr)_19rem]">
          <FrameCell pad="none" className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-frame-line px-(--cell-pad) py-3">
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-full rounded-[6px] sm:ms-auto sm:w-72" />
            </div>
            <div className="flex flex-wrap gap-1.5 border-b border-frame-line px-(--cell-pad) py-2.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-[6px]" />
              ))}
            </div>
            <div className="grid grid-cols-7 border-b border-frame-line">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex justify-center py-2.5">
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-24 border-e border-b border-frame-line p-1 sm:min-h-[7.25rem] [&:nth-child(7n)]:border-e-0 [&:nth-last-child(-n+7)]:border-b-0"
                >
                  <Skeleton className="size-7" />
                  {i % 3 === 0 && <Skeleton className="mt-3 h-4 w-4/5" />}
                </div>
              ))}
            </div>
          </FrameCell>
          <FrameCell pad="none" className="hidden flex-col xl:flex">
            <div className="border-b border-frame-line p-(--cell-pad)">
              <Skeleton className="h-[272px] w-full" />
            </div>
            <div className="flex min-h-13 items-center border-b border-frame-line px-(--cell-pad)">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-3 p-(--cell-pad)">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
