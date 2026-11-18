import { FinanceHeaderSkeleton, OverviewSkeleton } from "./_components/finance-skeletons";

/** Overview while it streams: the page box (nav + KPIs), the analytics and profitability boxes. */
export default function Loading() {
  return (
    <div aria-busy>
      <FinanceHeaderSkeleton kpis={4} />
      <OverviewSkeleton />
    </div>
  );
}
