import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { InvoiceEditorSkeleton } from "../../finance/_components/finance-skeletons";

/** The editor while it streams: the page box, then the form box beside the summary box. */
export default function Loading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton actions={false} />
      <InvoiceEditorSkeleton />
    </div>
  );
}
