import { Skeleton } from "@/components/ui/skeleton";

/** Calendar-shaped skeleton while the page streams in. */
export default function Loading() {
  return (
    <div aria-busy className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="overflow-hidden rounded-2xl border border-dashed">
          <div className="flex items-center gap-3 border-b border-dashed p-4">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="ms-auto h-9 w-64 rounded-xl" />
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 border-e border-b border-dashed p-2 sm:h-28">
                <Skeleton className="size-6 rounded-full" />
                {i % 3 === 0 && <Skeleton className="mt-3 h-4 w-4/5" />}
              </div>
            ))}
          </div>
        </div>
        <div className="hidden space-y-6 xl:block">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
