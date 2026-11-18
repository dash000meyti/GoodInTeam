import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FinanceHeaderSkeleton,
  RowsSkeleton,
  ToolbarRowSkeleton,
} from "../_components/finance-skeletons";

/** Transactions while they stream: the page box, then the list box (filters, totals, rows). */
export default function Loading() {
  return (
    <div aria-busy>
      <FinanceHeaderSkeleton />
      <FrameBox as="div" density="compact">
        <ToolbarRowSkeleton tall />
        <FrameGrid cols={1} className="sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <FrameCell key={i} className="space-y-2 py-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-36 max-w-full" />
            </FrameCell>
          ))}
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <RowsSkeleton rows={8} />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
