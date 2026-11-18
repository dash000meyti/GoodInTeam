import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Vault skeleton: the page box + the centered unlock / setup box (a tall
 * cell, then the reset row) while the session loads.
 */
export default function VaultLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <FrameBox as="div" density="compact" className="mx-auto w-full max-w-md">
        <FrameGrid cols={1}>
          <FrameCell pad="lg" className="flex flex-col items-center gap-4">
            <Skeleton className="size-16 rounded-none" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
            <div className="w-full space-y-3 pt-4" style={{ minHeight: 200 }}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="flex justify-center py-3">
            <Skeleton className="h-8 w-36 rounded-lg" />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
