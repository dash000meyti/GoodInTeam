import Link from "next/link";
import { ArrowUpRightIcon, FileSignatureIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractKindBadge, ContractStatusBadge } from "@/components/contracts/contract-badges";
import { formatDate } from "@/lib/format";
import { isAdmin } from "@/server/auth/actor";
import { canAccessContracts, listContracts } from "@/server/modules/contracts/service";
import type { PanelContext } from "@/server/page-context";

/**
 * Contracts linked to a project, for the project page.
 *
 *   <ProjectContractsPanel projectId={project.id} ctx={ctx} clientView={isClient} />
 *
 * Authorization comes from the contracts service (clients only ever get their
 * own client's sent documents). `clientView` additionally hides drafts (useful
 * when an admin previews the portal) and links rows to the signing page.
 * Renders nothing for roles without contract access (members).
 */
export async function ProjectContractsPanel({
  projectId,
  ctx,
  clientView = false,
}: {
  projectId: string;
  ctx: PanelContext;
  clientView?: boolean;
}) {
  const { actor, t, fmt, href } = ctx;
  if (!canAccessContracts(actor)) return null;
  const c = t.contracts;
  const portal = clientView || actor.user.role === "client";
  const rows = (await listContracts(actor, { projectId })).filter(
    (r) => !portal || (r.status !== "draft" && r.shareToken),
  );
  const canCreate = isAdmin(actor) && !portal;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignatureIcon className="size-5 text-primary" /> {c.projectPanelTitle}
        </CardTitle>
        {canCreate && (
          <CardAction>
            <Button asChild size="sm" variant="soft">
              <Link href={href(`/panel/contracts/new?projectId=${projectId}`)}>
                <PlusIcon /> {c.newForProject}
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            {c.projectPanelEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-dashed">
            {rows.map((r) => {
              const pending = r.effectiveStatus === "sent" || r.effectiveStatus === "viewed";
              const link = portal
                ? r.shareToken
                  ? href(`/sign/${r.shareToken}`)
                  : null
                : href(`/panel/contracts/${r.id}`);
              const date = r.signedAt ?? r.sentAt ?? r.updatedAt;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    {link ? (
                      <Link href={link} className="font-semibold hover:text-primary">
                        {r.title}
                      </Link>
                    ) : (
                      <span className="font-semibold">{r.title}</span>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <ContractKindBadge kind={r.kind} t={c} />
                      <span>{formatDate(date, fmt)}</span>
                    </div>
                  </div>
                  <ContractStatusBadge
                    status={r.effectiveStatus}
                    requireSignature={r.requireSignature}
                    t={c}
                  />
                  {portal && pending && link && (
                    <Button asChild size="sm">
                      <Link href={link}>
                        {r.requireSignature ? c.reviewAndSign : c.reviewAndApprove}
                        <ArrowUpRightIcon className="rtl:-scale-x-100" />
                      </Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
