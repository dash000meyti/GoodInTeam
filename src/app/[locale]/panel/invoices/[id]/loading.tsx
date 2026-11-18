import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { InvoiceDetailSkeleton } from "../../finance/_components/finance-skeletons";

/** An invoice while it streams: the page box, then the paper document beside the side box. */
export default function Loading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <InvoiceDetailSkeleton />
    </div>
  );
}
