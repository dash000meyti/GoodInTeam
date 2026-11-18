import {
  BoxSkeleton,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/panel/page-skeleton";
import { FrameBox } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Docs home / list skeleton (framed: page box, stat grid, list box). */
export function DocsHomeSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <StatGridSkeleton className="hidden sm:block" />
        <BoxSkeleton height={240} />
      </div>
    </div>
  );
}

/** Single doc page skeleton (title + article). */
export function DocPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-56" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-none" />
        <Skeleton className="h-9 w-72 max-w-[70%]" />
      </div>
      <Skeleton className="h-5 w-64" />
      <FrameBox as="div" density="compact" className="space-y-3 bg-card p-6 sm:p-10">
        {[90, 75, 82, 40, 88, 66, 92, 54].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </FrameBox>
    </div>
  );
}

/** Editor skeleton. */
export function DocEditorSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <BoxSkeleton height={520} />
        <BoxSkeleton height={340} />
      </div>
    </div>
  );
}
