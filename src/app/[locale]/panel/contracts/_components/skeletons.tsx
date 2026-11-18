import { PageHeaderSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/*
 * Loading states of the contracts routes, built from the same framed boxes
 * as the pages (static: no route data), so each page replaces its skeleton
 * box for box.
 */

function Lines({ height }: { height: number }) {
  return (
    <div className="space-y-3" style={{ minHeight: height }}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/** A section cell: a header row with a hairline, then a body. */
function SectionSkeleton({ height }: { height: number }) {
  return (
    <FrameGrid cols={1}>
      <FrameCell pad="none">
        <div className="flex min-h-13 items-center border-b border-frame-line px-(--cell-pad)">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="p-(--cell-pad)">
          <Lines height={height} />
        </div>
      </FrameCell>
    </FrameGrid>
  );
}

/** The list: the page box with three KPI cells, then chips, filters and table rows. */
export function ContractsListSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <FrameGrid cols={3}>
          {[0, 1, 2].map((i) => (
            <FrameCell key={i} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="mt-1.5 h-4 w-24" />
                <Skeleton className="size-9 rounded-none" />
              </div>
              <Skeleton className="h-8 w-20" />
            </FrameCell>
          ))}
          <FrameCell tone="dots" aria-hidden className="hidden md:block lg:hidden" />
        </FrameGrid>
      </PageHeaderSkeleton>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell className="flex gap-1.5 overflow-hidden py-3">
            {[56, 64, 104, 64, 64, 96].map((w, i) => (
              <Skeleton
                key={i}
                className="h-8 shrink-0 rounded-[6px]"
                style={{ width: `${w}px` }}
              />
            ))}
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="flex flex-col gap-3 py-3 sm:flex-row">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg sm:w-56" />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell pad="none" className="divide-y divide-frame-line">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex h-[66px] items-center gap-4 px-(--cell-pad) md:px-5">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-56 max-w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            ))}
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}

/** The detail: the page box, then the paper box beside the aside box. */
export function ContractDetailSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <FrameBox as="div" density="compact" className="bg-card">
          <FrameGrid cols={1}>
            <FrameCell tone="card" className="py-3">
              <Skeleton className="h-5 w-48" />
            </FrameCell>
          </FrameGrid>
          <FrameGrid cols={1}>
            <FrameCell tone="card" pad="none" className="px-4 py-8 sm:px-10 sm:py-10">
              <Lines height={480} />
            </FrameCell>
          </FrameGrid>
        </FrameBox>
        <FrameBox as="div" density="compact">
          <SectionSkeleton height={240} />
          <SectionSkeleton height={120} />
        </FrameBox>
      </div>
    </div>
  );
}

/** The editor: the page box, then the document box beside the settings box. */
export function ContractEditorSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton actions={false} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <FrameBox as="div" density="compact">
          <FrameGrid cols={1}>
            <FrameCell className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </FrameCell>
          </FrameGrid>
          <FrameGrid cols={1}>
            <FrameCell className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-[50vh] w-full rounded-lg" />
            </FrameCell>
          </FrameGrid>
        </FrameBox>
        <FrameBox as="div" density="compact">
          <FrameGrid cols={1}>
            <FrameCell>
              <Lines height={120} />
            </FrameCell>
          </FrameGrid>
          <FrameGrid cols={1}>
            <FrameCell>
              <Lines height={280} />
            </FrameCell>
          </FrameGrid>
        </FrameBox>
      </div>
    </div>
  );
}

/** The print view: the toolbar box over the A4 sheet. */
export function ContractPrintSkeleton() {
  return (
    <div aria-busy className="mx-auto max-w-[210mm] space-y-6">
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell className="flex items-center justify-between gap-3 py-2.5">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
      <FrameBox as="div" density="compact" className="bg-card">
        <FrameGrid cols={1}>
          <FrameCell tone="card" pad="none" className="px-5 py-8 sm:px-[16mm] sm:py-[18mm]">
            <Lines height={720} />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
