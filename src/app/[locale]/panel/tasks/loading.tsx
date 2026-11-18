import { BoxSkeleton, PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <BoxSkeleton header={false} height={72} />
        <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <BoxSkeleton header={false} height={320} className="hidden lg:block" />
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <BoxSkeleton height={340} />
          </div>
        </div>
      </div>
    </div>
  );
}
