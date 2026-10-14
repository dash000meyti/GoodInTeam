import Link from "next/link";
import { notFound } from "next/navigation";
import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { toDateInputValue } from "@/lib/tz";
import { AppError } from "@/server/errors";
import { getContract } from "@/server/modules/contracts/service";
import { panelContext } from "@/server/page-context";
import { ContractEditor } from "../../_components/contract-editor";
import { DuplicateButton } from "../../_components/duplicate-button";
import { editorData } from "../../_components/editor-data";

export default async function EditContractPage({
  params,
}: PageProps<"/[locale]/panel/contracts/[id]/edit">) {
  const { id } = await params;
  const { actor, t, href, tz, locale, now } = await panelContext({ roles: ["owner", "admin"] });
  const d = await getContract(actor, id, now).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const k = d.contract;
  const c = t.contracts;
  const detailHref = href(
    k.isTemplate ? "/panel/contracts?tab=templates" : `/panel/contracts/${k.id}`,
  );
  const crumbs = [
    { label: c.title, href: href("/panel/contracts") },
    k.isTemplate
      ? { label: c.tab_templates, href: href("/panel/contracts?tab=templates") }
      : { label: k.title, href: detailHref },
    { label: t.common.edit },
  ];

  if (!d.actions.includes("edit")) {
    const signed = d.effectiveStatus === "signed";
    return (
      <>
        <PageHeader title={k.title} crumbs={crumbs} />
        <EmptyState
          icon={LockIcon}
          title={signed ? c.signedLockedTitle : c.voidLockedTitle}
          description={signed ? c.signedLockedBody : undefined}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href={detailHref}>{t.common.back}</Link>
              </Button>
              <DuplicateButton id={k.id} asNewVersion={signed} />
            </div>
          }
        />
      </>
    );
  }

  const { clients, projects, templates, starters } = editorData(actor, locale);
  const sent = !k.isTemplate && d.effectiveStatus !== "draft";
  return (
    <>
      <PageHeader title={k.isTemplate ? c.editTemplate : c.edit} crumbs={crumbs} />
      <ContractEditor
        mode="edit"
        isTemplate={k.isTemplate}
        initial={{
          id: k.id,
          title: k.title,
          kind: k.kind,
          clientId: k.clientId,
          projectId: k.projectId,
          requireSignature: k.requireSignature,
          expiresAt: k.expiresAt ? toDateInputValue(k.expiresAt, tz) : null,
          signerName: k.signerName,
          signerEmail: k.signerEmail,
          bodyMd: k.bodyMd,
        }}
        clients={clients}
        projects={projects}
        templates={templates}
        starters={starters}
        sentVersion={sent ? k.version : undefined}
        cancelHref={detailHref}
      />
    </>
  );
}
