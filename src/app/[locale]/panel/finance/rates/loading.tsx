import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CellHeaderSkeleton,
  FinanceHeaderSkeleton,
  KpiRowSkeleton,
  RowsSkeleton,
} from "../_components/finance-skeletons";

/** FX rates while they stream: the page box (nav + base note), then latest rates over the history. */
export default function Loading() {
  return (
    <div aria-busy>
      <FinanceHeaderSkeleton>
        <FrameGrid cols={1}>
          <FrameCell className="py-3">
            <Skeleton className="h-5 w-3/4" />
          </FrameCell>
        </FrameGrid>
      </FinanceHeaderSkeleton>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <CellHeaderSkeleton action={false} />
            <KpiRowSkeleton count={3} />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <CellHeaderSkeleton action={false} />
            <RowsSkeleton rows={5} />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
