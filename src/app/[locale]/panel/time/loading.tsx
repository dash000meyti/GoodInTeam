import {
  BoxSkeleton,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/panel/page-skeleton";

export default function TimeLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <BoxSkeleton header={false} height={44} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <BoxSkeleton header={false} height={176} />
          <BoxSkeleton header={false} height={176} className="hidden md:block" />
        </div>
        <StatGridSkeleton />
        <BoxSkeleton height={240} />
      </div>
    </div>
  );
}
