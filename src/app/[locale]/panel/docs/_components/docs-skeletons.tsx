import { Skeleton } from "@/components/ui/skeleton";

/** Docs home / list skeleton. */
export function DocsHomeSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

/** Single doc page skeleton (title + article). */
export function DocPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-56" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <Skeleton className="h-9 w-72 max-w-[70%]" />
      </div>
      <Skeleton className="h-5 w-64" />
      <div className="space-y-3 rounded-2xl bg-card p-6 shadow-card sm:p-10 dark:border dark:border-border">
        {[90, 75, 82, 40, 88, 66, 92, 54].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Editor skeleton. */
export function DocEditorSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Skeleton className="h-[560px] rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
