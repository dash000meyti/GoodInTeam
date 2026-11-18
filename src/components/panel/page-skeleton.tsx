import type { ReactNode } from "react";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { OsLights } from "@/components/shell/os-lights";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading states for panel pages (loading.tsx), built from the same framed
 * boxes, strips and cells as the pages, so a streamed page replaces its
 * skeleton box for box. Static (no route data): the strip shows idle lights.
 */

/** The PageHeader box: strip, header cell (crumbs, title, description, action), lg decor cell. */
export function PageHeaderSkeleton({
  children,
  actions = true,
  className,
}: {
  /** More rows of the box (e.g. a StatRowSkeleton). */
  children?: ReactNode;
  actions?: boolean;
  className?: string;
}) {
  return (
    <FrameBox
      as="div"
      density="compact"
      className={cn("mb-6 lg:mb-8", className)}
      strip={
        <div className="frame-strip">
          <OsLights size={10} />
          <Skeleton className="hidden h-3.5 w-56 rounded-none md:block" />
        </div>
      }
    >
      <FrameGrid cols={1} className="lg:grid-cols-[minmax(0,1fr)_minmax(200px,22%)]">
        <FrameCell className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:min-h-[136px] lg:items-center">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          {actions && <Skeleton className="h-9 w-32 rounded-lg" />}
        </FrameCell>
        <FrameCell tone="dots" aria-hidden className="hidden items-center justify-center lg:flex">
          <Skeleton className="h-[94px] w-full max-w-56 rounded-[10px]" />
        </FrameCell>
      </FrameGrid>
      {children}
    </FrameBox>
  );
}

/** A row of stat cells (StatRow) with the StatCard's sizes. */
export function StatRowSkeleton({ count = 4 }: { count?: 2 | 4 }) {
  return (
    <FrameGrid cols={count}>
      {Array.from({ length: count }, (_, i) => (
        <FrameCell key={i} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="mt-1.5 h-4 w-24" />
            <Skeleton className="size-9 rounded-none" />
          </div>
          <Skeleton className="h-8 w-20" />
        </FrameCell>
      ))}
    </FrameGrid>
  );
}

/** A StatGrid while it streams: its own box around a StatRowSkeleton. */
export function StatGridSkeleton({ count = 4, className }: { count?: 2 | 4; className?: string }) {
  return (
    <FrameBox as="div" density="compact" className={className}>
      <StatRowSkeleton count={count} />
    </FrameBox>
  );
}

/** A Card-shaped box: a header row with a hairline, then a body of `height` px. */
export function BoxSkeleton({
  height = 320,
  header = true,
  className,
}: {
  height?: number;
  header?: boolean;
  className?: string;
}) {
  return (
    <FrameBox as="div" density="compact" className={className}>
      {header && (
        <div className="flex min-h-13 items-center justify-between gap-3 border-b border-frame-line px-(--cell-pad)">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      )}
      <div className="space-y-3 p-(--cell-pad)" style={{ minHeight: height }}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </FrameBox>
  );
}

/** Generic loading state for panel pages (used by loading.tsx). */
export function PageSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <StatRowSkeleton />
      </PageHeaderSkeleton>
      <BoxSkeleton height={360} />
    </div>
  );
}
