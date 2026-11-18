import { PageHeaderSkeleton, StatRowSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading states of the docs pages, box for box with the framed pages (the
 * layout's sidebar box stays in place from xl): the page box, the
 * toolbar box, then the page's own boxes.
 */

/** Below xl: the toolbar box (pages drawer + search) under the page box. */
function PagesBarSkeleton() {
  return (
    <FrameBox as="div" density="compact" className="mb-6 xl:hidden">
      <FrameGrid cols={1}>
        <FrameCell className="flex items-center gap-2 py-3">
          <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}

/** A box header row (CardHeader: 52px, hairline under it). */
function HeaderRowSkeleton({ width = "w-36" }: { width?: string }) {
  return (
    <div className="flex min-h-13 items-center border-b border-frame-line px-(--cell-pad)">
      <Skeleton className={`h-5 ${width}`} />
    </div>
  );
}

/** Rows sharing hairlines: icon tile, title and meta lines. */
function RowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-frame-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-(--cell-pad) py-3">
          <Skeleton className="size-9 shrink-0 rounded-none" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Docs home: page box with the counters row, toolbar, the recent + sections box. */
export function DocsHomeSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <StatRowSkeleton />
      </PageHeaderSkeleton>
      <PagesBarSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <HeaderRowSkeleton />
            <RowsSkeleton rows={4} />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <HeaderRowSkeleton width="w-24" />
            <FrameGrid cols={2}>
              {[0, 1].map((i) => (
                <FrameCell key={i} className="flex flex-col gap-3">
                  <Skeleton className="size-11 rounded-none" />
                  <Skeleton className="h-5 w-40 max-w-full" />
                  <Skeleton className="h-3 w-24" />
                </FrameCell>
              ))}
            </FrameGrid>
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}

/** Archive: page box, toolbar, one list box. */
export function DocsListSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton actions={false} />
      <PagesBarSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <RowsSkeleton rows={3} />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}

/** Single doc page: page box, toolbar, the article box (a centred reading column). */
export function DocPageSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <PagesBarSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <div className="px-(--cell-pad) py-8 sm:px-10 sm:py-10">
              <div className="mx-auto max-w-3xl space-y-3">
                {[90, 75, 82, 40, 88, 66, 92, 54].map((w, i) => (
                  <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}

/** Editor: page box, toolbar, the editor box (title row + markdown | page settings from xl). */
export function DocEditorSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton />
      <PagesBarSkeleton />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1} className="lg:grid-cols-[minmax(0,1fr)_19rem]">
          <FrameCell pad="none">
            <div className="flex items-center gap-3 border-b border-frame-line p-(--cell-pad)">
              <Skeleton className="size-14 shrink-0 rounded-none" />
              <Skeleton className="h-8 w-64 max-w-full" />
            </div>
            <div className="space-y-3 p-(--cell-pad)" style={{ minHeight: 460 }}>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </FrameCell>
          <FrameCell pad="none">
            <HeaderRowSkeleton width="w-28" />
            <div className="space-y-3 p-(--cell-pad)">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[70px] w-full rounded-none" />
              ))}
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
