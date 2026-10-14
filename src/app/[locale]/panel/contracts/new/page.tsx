import { PageHeader } from "@/components/panel/page-header";
import { AppError } from "@/server/errors";
import { applyTemplate } from "@/server/modules/contracts/service";
import { panelContext } from "@/server/page-context";
import { ContractEditor, type EditorValues } from "../_components/contract-editor";
import { editorData } from "../_components/editor-data";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/**
 * New document / template.
 * Query: ?asTemplate=1 · ?from=<templateId> · ?starter=<key> · ?projectId= · ?clientId=
 */
export default async function NewContractPage({
  searchParams,
}: PageProps<"/[locale]/panel/contracts/new">) {
  const { actor, t, href, locale } = await panelContext({ roles: ["owner", "admin"] });
  const sp = await searchParams;
  const isTemplate = one(sp.asTemplate) === "1";
  const { clients, projects, templates, starters } = editorData(actor, locale);

  const projectId = projects.some((p) => p.id === one(sp.projectId)) ? one(sp.projectId)! : null;
  const clientId =
    one(sp.clientId) && clients.some((x) => x.id === one(sp.clientId))
      ? one(sp.clientId)!
      : (projects.find((p) => p.id === projectId)?.clientId ?? null);
  const client = clients.find((x) => x.id === clientId);

  let initial: EditorValues = {
    title: "",
    kind: "contract",
    clientId,
    projectId,
    requireSignature: true,
    expiresAt: null,
    signerName: client?.signerName ?? null,
    signerEmail: client?.signerEmail ?? null,
    bodyMd: "",
  };

  const from = one(sp.from);
  const starter = one(sp.starter);
  if (!isTemplate && (from || starter)) {
    try {
      const r = applyTemplate(actor, {
        templateId: from,
        starter: from ? undefined : starter,
        clientId: clientId ?? undefined,
        projectId: projectId ?? undefined,
      });
      initial = {
        ...initial,
        title: r.title,
        kind: r.kind,
        requireSignature: r.requireSignature,
        bodyMd: r.bodyMd,
      };
    } catch (e) {
      if (!(e instanceof AppError && e.code === "not_found")) throw e;
    }
  }

  const c = t.contracts;
  const title = isTemplate ? c.newTemplate : c.new;
  return (
    <>
      <PageHeader
        title={title}
        crumbs={[
          { label: c.title, href: href("/panel/contracts") },
          ...(isTemplate
            ? [{ label: c.tab_templates, href: href("/panel/contracts?tab=templates") }]
            : []),
          { label: title },
        ]}
      />
      <ContractEditor
        mode="create"
        isTemplate={isTemplate}
        initial={initial}
        clients={clients}
        projects={projects}
        templates={templates}
        starters={starters}
        cancelHref={href(isTemplate ? "/panel/contracts?tab=templates" : "/panel/contracts")}
      />
    </>
  );
}
