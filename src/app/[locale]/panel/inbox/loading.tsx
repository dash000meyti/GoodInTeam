import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Inbox while it streams: the page box, then the list box (chips + search row, lead rows). */
export default function InboxLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton actions={false} />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
            <div className="flex gap-1.5 overflow-hidden py-0.5">
              {[56, 64, 80, 72, 56, 56, 56].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-8 shrink-0 rounded-[6px]"
                  style={{ width: `${w}px` }}
                />
              ))}
            </div>
            <Skeleton className="h-9 w-full rounded-lg lg:ms-auto lg:w-72" />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell pad="none" className="divide-y divide-frame-line">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-4 px-(--cell-pad) py-4">
                <Skeleton className="size-10 shrink-0 rounded-none" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
