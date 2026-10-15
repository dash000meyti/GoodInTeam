import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import { zId } from "@/lib/zod-helpers";
import { docInput, listDocsInput, searchDocsInput, updateDocInput } from "./schemas";
import * as svc from "./service";

const STAFF = ["owner", "admin", "member"] as const;

export const docsTools = [
  defineTool({
    name: "docs_list",
    title: "List docs",
    description:
      "List documentation pages the caller can read (no content). format='tree' (default) nests subpages under `children`; 'flat' returns one list ordered by position. Filter by projectId or visibility (private | team | client). Set archived=true to list archived pages instead.",
    input: listDocsInput,
    scope: "read",
    handler: (input, actor) => svc.listDocs(actor, input),
  }),
  defineTool({
    name: "docs_get",
    title: "Get doc",
    description:
      "Get one documentation page with its markdown content (`contentMd`), breadcrumbs (`ancestors`), direct subpages (`children`), linked project/client and who last edited it.",
    input: z.object({ id: zId }),
    scope: "read",
    handler: async ({ id }, actor) => {
      const doc = await svc.getDoc(actor, id);
      return {
        ...doc,
        children: doc.children.map((c) => ({
          id: c.id,
          title: c.title,
          icon: c.icon,
          visibility: c.visibility,
        })),
      };
    },
  }),
  defineTool({
    name: "docs_search",
    title: "Search docs",
    description:
      "Full-text search over titles and markdown content of pages the caller can read. Returns matches (title hits first) with a plain-text `snippet` around the first match. Persian ي/ك and Arabic forms are treated as equal.",
    input: searchDocsInput,
    scope: "read",
    handler: (input, actor) =>
      svc.searchDocs(actor, input).map((r) => ({
        id: r.id,
        title: r.title,
        icon: r.icon,
        visibility: r.visibility,
        projectId: r.projectId,
        projectName: r.projectName,
        parentId: r.parentId,
        updatedAt: r.updatedAt,
        titleMatch: r.titleMatch,
        snippet: r.snippet,
      })),
  }),
  defineTool({
    name: "docs_create",
    title: "Create doc",
    description:
      "Create a markdown documentation page. visibility: 'private' (only you), 'team' (all staff) or 'client' (also the portal users of the linked project's client when that project shares docs, or of the linked clientId — requires projectId or clientId). Use parentId to nest it under another page.",
    input: docInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.createDoc(actor, input),
  }),
  defineTool({
    name: "docs_update",
    title: "Update doc",
    description:
      "Update a page (partial): title, icon (emoji), contentMd (replaces the whole markdown body), parentId (move under another page; null = top level), projectId, clientId, visibility. Only the author or an admin may change visibility.",
    input: updateDocInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.updateDoc(actor, input),
  }),
  defineTool({
    name: "docs_delete",
    title: "Delete doc",
    description:
      "Permanently delete a page (author or admin only). Its subpages are kept and move up one level to the deleted page's parent.",
    input: z.object({ id: zId }),
    scope: "write",
    roles: [...STAFF],
    destructive: true,
    handler: ({ id }, actor) => svc.deleteDoc(actor, id),
  }),
];
