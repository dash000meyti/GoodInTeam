import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Skeletons that mirror the final layouts (same boxes/aspect ratios → no CLS). */

export function CardSkeleton({
  className,
  aspect = "aspect-[16/10]",
}: {
  className?: string;
  aspect?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-card shadow-card dark:border dark:border-border",
        className,
      )}
    >
      <Skeleton className={cn("rounded-none", aspect)} />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-12 sm:px-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="aspect-[16/9] w-full rounded-3xl" />
      <div className="space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

export function ChipsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-9 w-20 rounded-full" />
      ))}
    </div>
  );
}
