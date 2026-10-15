import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { AppError } from "@/server/errors";
import { getPost } from "@/server/modules/content/service";
import { panelContext } from "@/server/page-context";
import { editorContext, toEditorPost } from "../_components/editor-data";
import { PostEditor } from "../_components/post-editor";

export default async function EditPostPage({ params }: PageProps<"/[locale]/panel/content/[id]">) {
  const { actor, t, href, tz } = await panelContext({ roles: ["owner", "admin"] });
  const { id } = await params;
  let data: ReturnType<typeof getPost>;
  try {
    data = getPost(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
  const { post, translations, syndications, seriesSlug } = data;
  return (
    <>
      <PageHeader
        title={post.title}
        crumbs={[
          { label: t.nav.dashboard, href: href("/panel") },
          { label: t.content.title, href: href("/panel/content") },
          { label: t.site[`type_${post.type}`] },
        ]}
      />
      <PostEditor
        key={`${post.id}:${post.updatedAt.getTime()}`}
        initial={toEditorPost(post, tz, seriesSlug)}
        ctx={editorContext(actor, {
          translations: translations.map((x) => ({
            id: x.id,
            locale: x.locale,
            title: x.title,
            status: x.status,
          })),
          syndications: syndications
            .filter((s) => s.direction === "outbound")
            .map((s) => ({
              id: s.id,
              network: s.network,
              status: s.status,
              externalUrl: s.externalUrl,
            })),
        })}
      />
    </>
  );
}
