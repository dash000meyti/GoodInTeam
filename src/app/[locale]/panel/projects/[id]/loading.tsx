import { PageHeaderSkeleton, StatRowSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Project detail while it streams: the page box (header, stats, the tab
 * strip row), then the overview box (description | details).
 */
export default function ProjectLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <StatRowSkeleton />
        <FrameGrid cols={1}>
          <FrameCell className="flex gap-1.5 overflow-hidden py-3">
            {[72, 88, 72, 56, 56, 64].map((w, i) => (
              <Skeleton
                key={i}
                className="h-8 shrink-0 rounded-[6px]"
                style={{ width: `${w}px` }}
              />
            ))}
          </FrameCell>
        </FrameGrid>
      </PageHeaderSkeleton>
      <FrameBox as="div" density="compact">
        <FrameGrid cols="2-1">
          {[0, 1].map((i) => (
            <FrameCell key={i} pad="none">
              <div className="flex min-h-13 items-center border-b border-frame-line px-(--cell-pad)">
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="space-y-3 p-(--cell-pad)" style={{ minHeight: 200 }}>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </FrameCell>
          ))}
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
