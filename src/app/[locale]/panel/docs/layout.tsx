import { Suspense } from "react";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { isStaff } from "@/server/auth/actor";
import { countArchivedDocs, listDocRows } from "@/server/modules/docs/service";
import { panelContext } from "@/server/page-context";

/**
 * Docs shell: page tree on the start side (streams in with the session) and
 * the current page next to it. Each child segment has its own loading.tsx so
 * navigating between pages keeps the tree and shows a skeleton instantly.
 */
export default function DocsLayout({ children }: LayoutProps<"/[locale]/panel/docs">) {
  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18.5rem_minmax(0,1fr)]">
      <Suspense fallback={<SidebarSkeleton />}>
        <DocsSidebarSlot />
      </Suspense>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

async function DocsSidebarSlot() {
  const { actor } = await panelContext();
  const items = listDocRows(actor).map((r) => ({
    id: r.id,
    parentId: r.parentId,
    title: r.title,
    icon: r.icon,
    visibility: r.visibility,
    projectId: r.projectId,
    projectName: r.projectName,
    projectColor: r.projectColor,
  }));
  return (
    <DocsSidebar items={items} canEdit={isStaff(actor)} archivedCount={countArchivedDocs(actor)} />
  );
}

function SidebarSkeleton() {
  return (
    <>
      <Skeleton className="h-9 rounded-lg lg:hidden" />
      <div className="hidden space-y-3 rounded-2xl bg-card p-4 shadow-card lg:block dark:border dark:border-border">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-7" style={{ marginInlineStart: (i % 3) * 14 }} />
        ))}
      </div>
    </>
  );
}
