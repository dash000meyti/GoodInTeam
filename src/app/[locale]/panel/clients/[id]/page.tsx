import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FolderKanbanIcon,
  GlobeIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  UserRoundIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameGrid } from "@/components/shell/frame";
import { formatDateTime, formatPercent } from "@/lib/format";
import { AppError } from "@/server/errors";
import { getClient } from "@/server/modules/clients/service";
import { panelContext } from "@/server/page-context";
import { SectionCell } from "../../projects/_components/frame-parts";
import { ProjectStatusBadge } from "../../projects/_components/project-status-badge";
import { ClientFormDialog } from "../_components/client-form";
import { InviteClientUser } from "../_components/invite-user";

/**
 * Client detail (framed): the page box, then one box whose first row is the
 * client's projects (2fr) beside the contact cell (1fr) and whose second row
 * holds the portal users.
 */
export default async function ClientPage({ params }: PageProps<"/[locale]/panel/clients/[id]">) {
  const { id } = await params;
  const { actor, t, href, fmt, locale } = await panelContext({ roles: ["owner", "admin"] });
  const client = await getClient(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const c = t.clients;
  const hasContact = !!(client.email || client.phone || client.website || client.notes);
  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <ColorDot color={client.color} className="size-3.5 rounded-none" />
            <span className="min-w-0" dir="auto">
              {client.name}
            </span>
          </span>
        }
        description={c[`kind_${client.kind}`]}
        crumbs={[{ label: c.title, href: href("/panel/clients") }, { label: client.name }]}
        actions={
          <ClientFormDialog
            client={client}
            trigger={
              <Button variant="outline">
                <PencilIcon /> {t.common.edit}
              </Button>
            }
          />
        }
      />
      <FrameBox as="div" density="compact">
        <FrameGrid cols="2-1">
          <SectionCell
            title={t.common.projects}
            titleId="cl-projects"
            icon={FolderKanbanIcon}
            flush
          >
            {client.projects.length === 0 ? (
              <EmptyState icon={FolderKanbanIcon} title={t.common.empty} className="py-8" />
            ) : (
              <ul className="divide-y divide-frame-line">
                {client.projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={href(`/panel/projects/${p.id}`)}
                      className="flex items-center gap-4 px-(--cell-pad) py-3 transition-colors hover:bg-card hover:text-primary-ink"
                    >
                      <ColorDot color={p.color} className="rounded-none" />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        <bdi>{p.name}</bdi>
                      </span>
                      <Progress value={p.progress} className="hidden w-32 sm:block" />
                      <span className="w-10 text-xs font-bold tabular-nums">
                        {formatPercent(p.progress, locale)}
                      </span>
                      <ProjectStatusBadge status={p.status} t={t.projects} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCell>

          <SectionCell title={c.contact} titleId="cl-contact" icon={UserRoundIcon}>
            {hasContact ? (
              <div className="space-y-3 text-sm">
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-2 break-all hover:text-primary-ink"
                    dir="ltr"
                  >
                    <MailIcon className="size-4 shrink-0 text-muted-foreground" /> {client.email}
                  </a>
                )}
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-2 hover:text-primary-ink"
                    dir="ltr"
                  >
                    <PhoneIcon className="size-4 shrink-0 text-muted-foreground" /> {client.phone}
                  </a>
                )}
                {client.website && (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 break-all hover:text-primary-ink"
                    dir="ltr"
                  >
                    <GlobeIcon className="size-4 shrink-0 text-muted-foreground" /> {client.website}
                  </a>
                )}
                {client.notes && (
                  <p className="border border-dashed border-frame-line bg-card p-3 whitespace-pre-wrap text-muted-foreground">
                    {client.notes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{c.noContact}</p>
            )}
          </SectionCell>
        </FrameGrid>

        <FrameGrid cols={1}>
          <SectionCell
            title={c.portalUsers}
            titleId="cl-users"
            description={c.portalUsersHint}
            action={<InviteClientUser clientId={client.id} />}
            flush
          >
            {client.users.length === 0 ? (
              <p className="px-(--cell-pad) py-6 text-center text-sm text-muted-foreground">
                {t.common.empty}
              </p>
            ) : (
              <ul className="divide-y divide-frame-line">
                {client.users.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-(--cell-pad) py-3 text-sm"
                  >
                    <span className="font-semibold" dir="auto">
                      {u.name}
                    </span>
                    <span className="min-w-0 truncate text-muted-foreground" dir="ltr">
                      {u.email}
                    </span>
                    {u.disabled && <Badge variant="destructive">{c.userDisabled}</Badge>}
                    <span className="ms-auto text-xs text-muted-foreground">
                      {c.lastLogin}: {u.lastLoginAt ? formatDateTime(u.lastLoginAt, fmt) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCell>
        </FrameGrid>
      </FrameBox>
    </>
  );
}
