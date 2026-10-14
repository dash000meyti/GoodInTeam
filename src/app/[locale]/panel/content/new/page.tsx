import { PageHeader } from "@/components/panel/page-header";
import { format } from "@/i18n/format-message";
import { contentTypes, type ContentType } from "@/lib/content";
import { panelContext } from "@/server/page-context";
import { editorContext, emptyPost } from "../_components/editor-data";
import { PostEditor } from "../_components/post-editor";

export default async function NewPostPage({
  searchParams,
}: PageProps<"/[locale]/panel/content/new">) {
  const { actor, t, href, locale } = await panelContext({ roles: ["owner", "admin"] });
  const sp = await searchParams;
  const type = (contentTypes as readonly string[]).includes(String(sp.type))
    ? (sp.type as ContentType)
    : "article";
  const typeLabel = t.site[`type_${type}`];
  return (
    <>
      <PageHeader
        title={format(t.content.newOfType, { type: typeLabel })}
        crumbs={[
          { label: t.nav.dashboard, href: href("/panel") },
          { label: t.content.title, href: href("/panel/content") },
          { label: t.common.new },
        ]}
      />
      <PostEditor initial={emptyPost(type, locale)} ctx={editorContext(actor)} />
    </>
  );
}
