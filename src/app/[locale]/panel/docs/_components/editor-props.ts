import "server-only";
import { isAdmin } from "@/server/auth/actor";
import { clientOptions } from "@/server/modules/clients/service";
import {
  buildDocTree,
  docProjectOptions,
  flattenDocTree,
  listDocRows,
} from "@/server/modules/docs/service";
import type { PanelContext } from "@/server/page-context";

/** Select options for the doc editor (parents exclude the page itself + its subtree). */
export function editorOptions(ctx: PanelContext, excludeId?: string) {
  const { actor } = ctx;
  const rows = listDocRows(actor);
  const parents = flattenDocTree(buildDocTree(rows), { exclude: excludeId }).map((p) => ({
    id: p.id,
    title: p.title,
    icon: p.icon,
    depth: p.depth,
    visibility: p.visibility,
    projectId: p.projectId,
    clientId: p.clientId,
  }));
  return {
    parents,
    projects: docProjectOptions(actor),
    clients: isAdmin(actor) ? clientOptions(actor).map((c) => ({ id: c.id, name: c.name })) : [],
  };
}
