import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Media library loading state: the page box, then the library box (upload row, chips, file grid). */
export default function Loading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton actions={false} />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell>
            <div className="flex h-[184px] flex-col items-center justify-center gap-3 border border-dashed border-frame-line bg-card">
              <Skeleton className="size-14 rounded-none" />
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="py-3">
            <div className="flex gap-1.5 overflow-hidden py-0.5">
              {[16, 20, 24, 20].map((w, i) => (
                <Skeleton key={i} className="h-8 shrink-0 rounded-[6px]" style={{ width: w * 4 }} />
              ))}
            </div>
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={3} className="xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <FrameCell
              key={i}
              pad="none"
              className={i === 3 ? "hidden md:block lg:hidden xl:block" : undefined}
            >
              <Skeleton className="aspect-[4/3] w-full rounded-none border-b border-frame-line" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </FrameCell>
          ))}
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
