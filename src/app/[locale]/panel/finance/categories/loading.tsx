import { FrameBox, FrameGrid } from "@/components/shell/frame";
import { BoxCellSkeleton, FinanceHeaderSkeleton } from "../_components/finance-skeletons";

/** Categories while they stream: the page box, then income | expense cells of one box. */
export default function Loading() {
  return (
    <div aria-busy>
      <FinanceHeaderSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1} className="lg:grid-cols-2">
          <BoxCellSkeleton rows={5} />
          <BoxCellSkeleton rows={5} />
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
