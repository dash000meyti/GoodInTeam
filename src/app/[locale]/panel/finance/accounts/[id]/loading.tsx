import { FinanceHeaderSkeleton, ListBoxSkeleton } from "../../_components/finance-skeletons";

/** An account while it streams: the page box (nav + KPIs), then the statement box. */
export default function Loading() {
  return (
    <div aria-busy>
      <FinanceHeaderSkeleton kpis={4} />
      <ListBoxSkeleton header rows={8} />
    </div>
  );
}
