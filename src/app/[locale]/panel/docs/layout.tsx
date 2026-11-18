import { Suspense } from "react";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { isStaff } from "@/server/auth/actor";
import { countArchivedDocs } from "@/server/modules/docs/service";
import { panelContext } from "@/server/page-context";
import { docTreeItems } from "./_components/pages-bar";

/**
 * Docs shell: from xl, the page tree is a sticky framed box on the start side
 * (streams in with the session) next to the current page; below xl each page
 * renders the tree's toolbar box under its own header (`DocsPagesBarSlot`) —
 * the page box needs the full width there for its title, actions and decor.
 * Each child segment has its own loading.tsx so navigating between pages
 * keeps the tree and shows a skeleton instantly.
 */
export default function DocsLayout({ children }: LayoutProps<"/[locale]/panel/docs">) {
  return (
    <div className="grid gap-6 xl:grid-cols-[18.5rem_minmax(0,1fr)] xl:gap-8">
      <Suspense fallback={<SidebarSkeleton />}>
        <DocsSidebarSlot />
      </Suspense>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

async function DocsSidebarSlot() {
  const { actor } = await panelContext();
  return (
    <DocsSidebar
      items={docTreeItems(actor)}
      canEdit={isStaff(actor)}
      archivedCount={countArchivedDocs(actor)}
    />
  );
}

/** The sidebar box while it streams: the same rows (header, search + filter, tree, archive). */
function SidebarSkeleton() {
  return (
    <div className="hidden xl:block" aria-hidden>
      <FrameBox as="div" density="compact" className="sticky below-chrome">
        <FrameGrid cols={1}>
          <FrameCell className="flex items-center justify-between gap-2 py-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="space-y-2.5 py-3">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell pad="none" className="py-2">
            {[0, 1, 1, 0, 1, 2, 0].map((depth, i) => (
              <div key={i} className="flex h-8 items-center px-(--cell-pad)">
                <Skeleton
                  className="h-4"
                  style={{ marginInlineStart: depth * 14 + 24, width: `${70 - depth * 10}%` }}
                />
              </div>
            ))}
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="py-3">
            <Skeleton className="h-5 w-24" />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}
