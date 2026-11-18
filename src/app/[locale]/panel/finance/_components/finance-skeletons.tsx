import type { ReactNode } from "react";
import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import {
  FrameBox,
  FrameCell,
  FrameGrid,
  type FrameCols,
  type FrameSpan,
} from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CHIP_ROW, DOTS_FILL } from "./frame-bits";

/*
 * Loading states of the finance and invoice routes (loading.tsx), built from
 * the same framed boxes as the pages (static: no route data), so a streamed
 * page replaces its skeleton box for box at the same sizes.
 */

const CHIP_WIDTHS = ["w-24", "w-32", "w-24", "w-28", "w-24", "w-24"];

/** The finance nav row of the page box (six chips). */
export function FinanceNavSkeleton() {
  return (
    <FrameGrid cols={1}>
      <FrameCell className="py-3">
        <div className={cn(CHIP_ROW, "overflow-hidden")}>
          {CHIP_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={cn("h-8 shrink-0 rounded-[6px]", w)} />
          ))}
        </div>
      </FrameCell>
    </FrameGrid>
  );
}

const COLS: Record<number, FrameCols> = { 1: 1, 2: 2, 3: 3, 4: 4 };

/** A row of KPI cells (KpiCard sizes: icon tile + label, the value, a hint). */
export function KpiRowSkeleton({
  count = 4,
  className,
}: {
  count?: 1 | 2 | 3 | 4;
  /** Same as the page's StatRow (e.g. `max-sm:grid-cols-1` for exact amounts). */
  className?: string;
}) {
  return (
    <FrameGrid cols={COLS[count]!} className={className}>
      {Array.from({ length: count }, (_, i) => (
        <FrameCell key={i} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-9 rounded-none" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-8 w-36 max-w-full" />
          <Skeleton className="h-3 w-24" />
        </FrameCell>
      ))}
    </FrameGrid>
  );
}

/** The page box of a finance page: header, the nav row and (optionally) a KPI row. */
export function FinanceHeaderSkeleton({
  kpis,
  exact,
  nav = true,
  children,
}: {
  kpis?: 1 | 2 | 3 | 4;
  /** KPIs with exact amounts: one per row on phones, like the page's StatRow. */
  exact?: boolean;
  nav?: boolean;
  children?: ReactNode;
}) {
  return (
    <PageHeaderSkeleton>
      {nav && <FinanceNavSkeleton />}
      {kpis && <KpiRowSkeleton count={kpis} className={exact ? "max-sm:grid-cols-1" : undefined} />}
      {children}
    </PageHeaderSkeleton>
  );
}

/** A cell's header row (CardHeader sizes: title + description, an action). */
export function CellHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex min-h-13 items-center justify-between gap-3 border-b border-frame-line px-(--cell-pad) py-3">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3.5 w-48 max-w-full" />
      </div>
      {action && <Skeleton className="h-8 w-20 rounded-md" />}
    </div>
  );
}

/** Edge-to-edge rows (a table or a row list) of `rows` × 60px. */
export function RowsSkeleton({ rows = 6, head = true }: { rows?: number; head?: boolean }) {
  return (
    <div>
      {head && (
        <div className="flex h-10 items-center gap-6 border-b border-frame-line px-(--cell-pad)">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="ms-auto h-3.5 w-20" />
        </div>
      )}
      <ul className="divide-y divide-frame-line">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex h-[60px] items-center gap-3 px-(--cell-pad)">
            <Skeleton className="size-8 shrink-0 rounded-none" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3 min-w-24" />
              <Skeleton className="h-3 w-1/4 min-w-16" />
            </div>
            <Skeleton className="h-4 w-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A cell with a header row over a body of `height` px (BoxCell sizes). */
export function BoxCellSkeleton({
  height = 240,
  rows,
  span,
  className,
}: {
  height?: number;
  /** Edge-to-edge rows instead of a padded body. */
  rows?: number;
  span?: FrameSpan;
  className?: string;
}) {
  return (
    <FrameCell pad="none" span={span} className={cn("flex flex-col", className)}>
      <CellHeaderSkeleton />
      {rows ? (
        <>
          <RowsSkeleton rows={rows} head={false} />
          <div aria-hidden className={cn("min-h-0 flex-1", DOTS_FILL)} />
        </>
      ) : (
        <div className="space-y-3 p-(--cell-pad)" style={{ minHeight: height }}>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
    </FrameCell>
  );
}

/** A toolbar row (chips, a select, a search box). */
export function ToolbarRowSkeleton({ tall }: { tall?: boolean }) {
  return (
    <FrameGrid cols={1}>
      <FrameCell className={cn("flex flex-wrap items-center gap-3", !tall && "py-3")}>
        {tall ? (
          <div className="w-full space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-8 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <Skeleton className="h-8 w-24 rounded-[6px]" />
            <Skeleton className="h-8 w-28 rounded-[6px]" />
            <Skeleton className="h-8 w-40 rounded-lg" />
          </>
        )}
      </FrameCell>
    </FrameGrid>
  );
}

/** A box: a toolbar row (optional) over one cell of edge-to-edge rows. */
export function ListBoxSkeleton({
  toolbar,
  rows = 8,
  header,
}: {
  toolbar?: "chips" | "filters";
  rows?: number;
  /** A header row (title) on the list cell. */
  header?: boolean;
}) {
  return (
    <FrameBox as="div" density="compact">
      {toolbar && <ToolbarRowSkeleton tall={toolbar === "filters"} />}
      <FrameGrid cols={1}>
        <FrameCell pad="none">
          {header && <CellHeaderSkeleton action={false} />}
          <RowsSkeleton rows={rows} />
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}

/** The overview below its page box: the analytics box, then the profitability box. */
export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <FrameBox as="div" density="compact">
        <ToolbarRowSkeleton />
        <FrameGrid cols="2-1">
          <BoxCellSkeleton height={420} />
          <BoxCellSkeleton rows={5} />
        </FrameGrid>
        <FrameGrid cols={3}>
          <BoxCellSkeleton height={300} />
          <BoxCellSkeleton height={300} />
          <BoxCellSkeleton rows={2} span="md2" />
        </FrameGrid>
      </FrameBox>
      <ListBoxSkeleton header rows={4} />
    </div>
  );
}

/** A box of `count` cells sharing hairlines (2 per row at md, 3 at lg), e.g. the accounts. */
export function CellsBoxSkeleton({ count = 3 }: { count?: number }) {
  return (
    <FrameBox as="div" density="compact">
      <FrameGrid cols={3}>
        {Array.from({ length: count }, (_, i) => (
          <FrameCell key={i} className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-none" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-40 max-w-full" />
            </div>
            <Skeleton className="h-6 w-full" />
          </FrameCell>
        ))}
      </FrameGrid>
    </FrameBox>
  );
}

/** A ledger box: the hint row, a currency header row and its lines. */
export function LedgerSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <FrameBox as="div" density="compact">
      <FrameGrid cols={1}>
        <FrameCell className="py-3">
          <Skeleton className="h-4 w-3/4" />
        </FrameCell>
      </FrameGrid>
      <FrameGrid cols={1}>
        <FrameCell pad="none">
          <CellHeaderSkeleton action={false} />
          <RowsSkeleton rows={rows} />
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}

/** The invoice detail below its page box: the paper document beside the side box (xl). */
export function InvoiceDetailSkeleton() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <FrameBox as="div" density="compact" className="bg-card">
        <div aria-hidden className="h-1.5 bg-primary/40" />
        <div className="space-y-8 p-5 sm:p-10" style={{ minHeight: 880 }}>
          <div className="flex justify-between gap-6">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-12 w-36" />
          </div>
          <Skeleton className="h-36 w-full rounded-none" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="ms-auto h-32 w-80 max-w-full" />
        </div>
      </FrameBox>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <BoxCellSkeleton height={60} />
        </FrameGrid>
        <FrameGrid cols={1}>
          <BoxCellSkeleton height={80} />
        </FrameGrid>
      </FrameBox>
    </div>
  );
}

/** The invoice editor: the form box beside the sticky summary box (xl). */
export function InvoiceEditorSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <FrameBox as="div" density="compact" className="min-w-0">
        <FrameGrid cols={1}>
          <FrameCell className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <BoxCellSkeleton rows={2} />
        </FrameGrid>
        <FrameGrid cols={2}>
          {Array.from({ length: 2 }, (_, i) => (
            <FrameCell key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-[98px] w-full rounded-lg" />
            </FrameCell>
          ))}
        </FrameGrid>
      </FrameBox>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <BoxCellSkeleton height={200} />
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="flex items-center justify-between py-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-32" />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="grid gap-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
