import {
  BoxSkeleton,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/panel/page-skeleton";

export default function ReportsLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <BoxSkeleton header={false} height={48} />
        <StatGridSkeleton />
        <div className="grid gap-6 xl:grid-cols-3">
          <BoxSkeleton height={330} className="xl:col-span-2" />
          <BoxSkeleton height={330} />
        </div>
      </div>
    </div>
  );
}
