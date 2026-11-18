import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ height }: { height: number }) {
  return (
    <FrameCell pad="none">
      <div className="flex min-h-13 items-center border-b border-frame-line px-(--cell-pad)">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-3 p-(--cell-pad)" style={{ minHeight: height }}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </FrameCell>
  );
}

/** Client detail while it streams: the page box, then projects | contact and the users row. */
export default function ClientLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols="2-1">
          <SectionSkeleton height={160} />
          <SectionSkeleton height={160} />
        </FrameGrid>
        <FrameGrid cols={1}>
          <SectionSkeleton height={96} />
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
