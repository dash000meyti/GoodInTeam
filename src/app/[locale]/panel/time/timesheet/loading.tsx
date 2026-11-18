import { BoxSkeleton, PageHeaderSkeleton } from "@/components/panel/page-skeleton";

export default function TimesheetLoading() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <BoxSkeleton height={420} />
    </div>
  );
}
