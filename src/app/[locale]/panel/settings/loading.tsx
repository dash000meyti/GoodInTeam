import { BoxSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for a settings sub-page (the settings nav stays in place): framed boxes. */
export default function SettingsLoading() {
  return (
    <div className="space-y-6" aria-busy>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
      <BoxSkeleton height={240} />
      <BoxSkeleton height={160} />
    </div>
  );
}
