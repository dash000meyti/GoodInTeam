import {
  BoxSkeleton,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/panel/page-skeleton";

export default function Loading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <BoxSkeleton header={false} height={112} />
        <StatGridSkeleton />
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <BoxSkeleton height={200} />
            <BoxSkeleton height={140} />
          </div>
          <BoxSkeleton height={220} />
        </div>
      </div>
    </div>
  );
}
