import { PageHeaderSkeleton, StatRowSkeleton } from "@/components/panel/page-skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { ChipRowSkeleton } from "./content-nav";

/**
 * Loading states of the CMS pages, box for box with the framed pages: the
 * page box (with the sub-navigation row), then the page's own boxes.
 */

/** Table-like rows sharing hairlines (title + path, then short columns). */
function ListRowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-frame-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-(--cell-pad) py-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </div>
          <Skeleton className="hidden h-5 w-16 md:block" />
          <Skeleton className="hidden h-4 w-14 md:block" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Posts: page box (sub-navigation + KPIs), the list box (filters row + rows). */
export function PostsSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <ChipRowSkeleton />
        <StatRowSkeleton />
      </PageHeaderSkeleton>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell className="flex flex-wrap gap-2 py-3">
            <Skeleton className="h-9 w-full md:w-auto md:flex-1" />
            <Skeleton className="h-9 flex-1 md:w-40 md:flex-none" />
            <Skeleton className="h-9 flex-1 md:w-36 md:flex-none" />
            <Skeleton className="h-9 flex-1 md:w-40 md:flex-none" />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <ListRowsSkeleton rows={6} />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}

/** Courses: page box (sub-navigation), one list box. */
export function SeriesSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <ChipRowSkeleton />
      </PageHeaderSkeleton>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <ListRowsSkeleton rows={3} />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}

/** Testimonials: page box (sub-navigation), the quotes as one framed grid. */
export function TestimonialsSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton>
        <ChipRowSkeleton />
      </PageHeaderSkeleton>
      <FrameBox as="div" density="compact">
        <FrameGrid cols={3}>
          {[0, 1, 2].map((i) => (
            <FrameCell key={i} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <Skeleton className="h-5 w-28" />
            </FrameCell>
          ))}
        </FrameGrid>
      </FrameBox>
    </div>
  );
}

/** A section of an editor column: header row (52px, hairline) over fields. */
function SectionSkeleton({ header = true, fields }: { header?: boolean; fields: number }) {
  return (
    <FrameGrid cols={1}>
      <FrameCell pad="none">
        {header && (
          <div className="flex min-h-13 items-center border-b border-frame-line px-(--cell-pad)">
            <Skeleton className="h-5 w-32" />
          </div>
        )}
        <div className="space-y-5 p-(--cell-pad)">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </FrameCell>
    </FrameGrid>
  );
}

/** Post editor: page box, the editor box (writing column | publishing column from lg). */
export function PostEditorSkeleton() {
  return (
    <div aria-busy>
      <PageHeaderSkeleton actions={false} />
      <FrameBox as="div" density="compact">
        <FrameGrid cols={1} className="lg:grid-cols-[minmax(0,1fr)_22rem]">
          <FrameCell pad="none">
            <FrameGrid cols={1}>
              <FrameCell className="space-y-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-[420px] w-full" />
                </div>
              </FrameCell>
            </FrameGrid>
          </FrameCell>
          <FrameCell pad="none">
            <SectionSkeleton fields={3} />
            <SectionSkeleton fields={3} />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
