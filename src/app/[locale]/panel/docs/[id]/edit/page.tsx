import { notFound, redirect } from "next/navigation";
import { DocEditor } from "@/components/docs/doc-editor";
import { AppError } from "@/server/errors";
import { getDoc } from "@/server/modules/docs/service";
import { panelContext } from "@/server/page-context";
import { editorOptions } from "../../_components/editor-props";

export default async function EditDocPage({ params }: PageProps<"/[locale]/panel/docs/[id]/edit">) {
  const { id } = await params;
  const ctx = await panelContext({ roles: ["owner", "admin", "member"] });
  const { actor, t, href, fmt } = ctx;
  const doc = await getDoc(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  if (!doc.canEdit) redirect(href(`/panel/docs/${id}`));
  const options = editorOptions(ctx, doc.id);

  return (
    <DocEditor
      key={`${doc.id}:${doc.updatedAt.getTime()}`}
      docId={doc.id}
      canManage={doc.canManage}
      initial={{
        title: doc.title,
        icon: doc.icon,
        contentMd: doc.contentMd,
        visibility: doc.visibility,
        parentId: doc.parentId,
        projectId: doc.projectId,
        clientId: doc.clientId,
      }}
      {...options}
      fmt={fmt}
      crumbs={[
        { label: t.docs.title, href: href("/panel/docs") },
        { label: doc.title, href: href(`/panel/docs/${doc.id}`) },
        { label: t.docs.editPage },
      ]}
    />
  );
}
