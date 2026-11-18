import { FinanceHeaderSkeleton, LedgerSkeleton } from "../../../_components/finance-skeletons";

/** A ledger while it streams: the page box (nav + totals), then the ledger box. */
export default function Loading() {
  return (
    <div aria-busy>
      <FinanceHeaderSkeleton kpis={4} exact />
      <LedgerSkeleton />
    </div>
  );
}
