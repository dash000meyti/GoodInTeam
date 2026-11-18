import { BoxSkeleton, PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Calendar-shaped skeleton while the page streams in (framed boxes). */
export default function Loading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <FrameBox as="div" density="compact">
          <div className="flex items-center gap-3 border-b border-frame-line p-4">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="ms-auto h-9 w-64 rounded-xl" />
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="h-24 border-e border-b border-frame-line p-2 sm:h-28 [&:nth-child(7n)]:border-e-0 [&:nth-last-child(-n+7)]:border-b-0"
              >
                <Skeleton className="size-6 rounded-full" />
                {i % 3 === 0 && <Skeleton className="mt-3 h-4 w-4/5" />}
              </div>
            ))}
          </div>
        </FrameBox>
        <div className="hidden space-y-6 xl:block">
          <BoxSkeleton header={false} height={288} />
          <BoxSkeleton height={260} />
        </div>
      </div>
    </div>
  );
}
