import "server-only";
import { DocsPagesBar, type DocTreeItem } from "@/components/docs/docs-sidebar";
import { isStaff, type Actor } from "@/server/auth/actor";
import { countArchivedDocs, listDocRows } from "@/server/modules/docs/service";

/** The page tree as the sidebar and the drawer need it (only what they render). */
export function docTreeItems(actor: Actor): DocTreeItem[] {
  return listDocRows(actor).map((r) => ({
    id: r.id,
    parentId: r.parentId,
    title: r.title,
    icon: r.icon,
    visibility: r.visibility,
    projectId: r.projectId,
    projectName: r.projectName,
    projectColor: r.projectColor,
  }));
}

/**
 * Below xl: the toolbar box under a docs page's header (pages
 * drawer + search). Each page renders it right after its PageHeader, so the
 * header stays the page's first box; from xl the layout's sidebar box takes over.
 */
export function DocsPagesBarSlot({ actor }: { actor: Actor }) {
  return (
    <DocsPagesBar
      items={docTreeItems(actor)}
      canEdit={isStaff(actor)}
      archivedCount={countArchivedDocs(actor)}
    />
  );
}
