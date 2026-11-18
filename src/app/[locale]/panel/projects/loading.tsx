import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Projects list while it streams: the page box, then one framed grid of project cells. */
export default function ProjectsLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={3}>
          {Array.from({ length: 6 }, (_, i) => (
            <FrameCell
              key={i}
              className={i >= 2 ? "hidden md:flex md:flex-col md:gap-4" : "flex flex-col gap-4"}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-6 w-14 rounded-md" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-2 h-1.5 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </FrameCell>
          ))}
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
