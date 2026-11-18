import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the framed tasks page: page box, then the tasks box (quick add, lists | list). */
export default function TasksLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <div className="flex h-16 items-center gap-3 px-(--cell-pad)">
              <Skeleton className="size-5" />
              <Skeleton className="h-5 w-64 max-w-full" />
            </div>
            <div className="flex min-h-9 items-center border-t border-frame-line px-(--cell-pad) py-2">
              <Skeleton className="h-3 w-80 max-w-full" />
            </div>
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1} className="lg:grid-cols-[15rem_minmax(0,1fr)]">
          <FrameCell pad="none">
            <div className="flex gap-1.5 overflow-hidden px-(--cell-pad) py-3 lg:hidden">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-[6px]" />
              ))}
            </div>
            <div className="hidden space-y-1 py-2 lg:block">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-(--cell-pad) py-1.5">
                  <Skeleton className="size-7 rounded-none" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </FrameCell>
          <FrameCell pad="none">
            <div className="flex flex-wrap gap-2 border-b border-frame-line px-(--cell-pad) py-3">
              <Skeleton className="h-9 flex-1 basis-full rounded-lg sm:basis-52" />
              <Skeleton className="h-9 w-[calc(50%-0.25rem)] rounded-lg sm:w-44" />
              <Skeleton className="h-9 w-[calc(50%-0.25rem)] rounded-lg sm:w-36" />
            </div>
            <div className="divide-y divide-frame-line">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-start gap-3 px-(--cell-pad) py-3">
                  <Skeleton className="mt-0.5 size-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
