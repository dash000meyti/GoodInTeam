import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Clients while they stream: the page box, then the table box (head row + rows). */
export default function ClientsLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell pad="none" className="divide-y divide-frame-line">
            <div className="hidden h-10 items-center px-5 md:flex">
              <Skeleton className="h-3.5 w-24" />
            </div>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex h-[61px] items-center gap-3 px-(--cell-pad) md:px-5">
                <Skeleton className="size-9 rounded-none" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ms-auto h-5 w-16 rounded-md" />
              </div>
            ))}
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
