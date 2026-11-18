import { BoxSkeleton, PageHeaderSkeleton } from "@/components/panel/page-skeleton";

/** Vault skeleton: the page box + a centered box (setup / unlock) while the session loads. */
export default function VaultLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton actions={false} />
      <BoxSkeleton header={false} height={420} className="mx-auto w-full max-w-md" />
    </div>
  );
}
