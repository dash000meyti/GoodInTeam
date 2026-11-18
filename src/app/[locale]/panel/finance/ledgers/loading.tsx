import { FinanceHeaderSkeleton, ListBoxSkeleton } from "../_components/finance-skeletons";

/** Ledgers while they stream: the page box, then the list box (view chips, rows). */
export default function Loading() {
  return (
    <div aria-busy>
      <FinanceHeaderSkeleton />
      <ListBoxSkeleton toolbar="chips" rows={6} />
    </div>
  );
}
