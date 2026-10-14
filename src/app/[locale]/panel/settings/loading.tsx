import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for a settings sub-page (the settings nav stays in place). */
export default function SettingsLoading() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
