import { Skeleton } from "@/components/ui/skeleton";

/** Vault skeleton: header + centered card (setup / unlock) while the session loads. */
export default function VaultLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="mx-auto h-[420px] w-full max-w-md rounded-2xl" />
    </div>
  );
}
