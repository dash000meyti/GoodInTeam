import { CellsBoxSkeleton, FinanceHeaderSkeleton } from "../_components/finance-skeletons";

/** Accounts while they stream: the page box (nav + totals), then the accounts box. */
export default function Loading() {
  return (
    <div aria-busy>
      <FinanceHeaderSkeleton kpis={3} />
      <CellsBoxSkeleton count={3} />
    </div>
  );
}
