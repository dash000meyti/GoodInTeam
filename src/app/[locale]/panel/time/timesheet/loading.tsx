import { Skeleton } from "@/components/ui/skeleton";

export default function TimesheetLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}
