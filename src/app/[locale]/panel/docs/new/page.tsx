import { DocEditor } from "@/components/docs/doc-editor";
import type { DocVisibility } from "@/components/docs/visibility-badge";
import { panelContext } from "@/server/page-context";
import { editorOptions } from "../_components/editor-props";

/**
 * New page. `?parentId=` nests it (and inherits the parent's visibility and
 * links); `?projectId=` pre-links a project (from the project page).
 */
export default async function NewDocPage({ searchParams }: PageProps<"/[locale]/panel/docs/new">) {
  const ctx = await panelContext({ roles: ["owner", "admin", "member"] });
  const { t, href, fmt } = ctx;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const options = editorOptions(ctx);

  const parent = options.parents.find((p) => p.id === one(sp.parentId)) ?? null;
  const project = options.projects.find((p) => p.id === one(sp.projectId)) ?? null;
  // Inherit visibility/links from the parent page; project pages default to team.
  const visibility: DocVisibility = parent?.visibility ?? (project ? "team" : "private");

  return (
    <DocEditor
      docId={null}
      canManage
      initial={{
        title: "",
        icon: null,
        contentMd: "",
        visibility,
        parentId: parent?.id ?? null,
        projectId: project?.id ?? parent?.projectId ?? null,
        clientId: parent?.clientId ?? null,
      }}
      {...options}
      fmt={fmt}
      crumbs={[{ label: t.docs.title, href: href("/panel/docs") }, { label: t.docs.newPageTitle }]}
    />
  );
}
