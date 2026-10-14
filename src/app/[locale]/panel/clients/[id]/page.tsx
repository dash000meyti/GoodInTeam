import Link from "next/link";
import { notFound } from "next/navigation";
import { MailIcon, PencilIcon, PhoneIcon, GlobeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/shared/color-dot";
import { PageHeader } from "@/components/panel/page-header";
import { formatDateTime, formatPercent } from "@/lib/format";
import { AppError } from "@/server/errors";
import { getClient } from "@/server/modules/clients/service";
import { panelContext } from "@/server/page-context";
import { ProjectStatusBadge } from "../../projects/_components/project-status-badge";
import { ClientFormDialog } from "../_components/client-form";
import { InviteClientUser } from "../_components/invite-user";

export default async function ClientPage({ params }: PageProps<"/[locale]/panel/clients/[id]">) {
  const { id } = await params;
  const { actor, t, href, fmt, locale } = await panelContext({ roles: ["owner", "admin"] });
  const client = await getClient(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const c = t.clients;
  return (
    <>
      <PageHeader
        title={client.name}
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
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ColorDot color={client.color} /> {client.name}
            </CardTitle>
            <CardDescription>{c[`kind_${client.kind}`]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-2 hover:text-primary"
                dir="ltr"
              >
                <MailIcon className="size-4 text-muted-foreground" /> {client.email}
              </a>
            )}
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-2 hover:text-primary"
                dir="ltr"
              >
                <PhoneIcon className="size-4 text-muted-foreground" /> {client.phone}
              </a>
            )}
            {client.website && (
              <a
                href={client.website}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 hover:text-primary"
                dir="ltr"
              >
                <GlobeIcon className="size-4 text-muted-foreground" /> {client.website}
              </a>
            )}
            {client.notes && (
              <p className="rounded-lg bg-muted p-3 whitespace-pre-wrap text-muted-foreground">
                {client.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.common.projects}</CardTitle>
          </CardHeader>
          <CardContent>
            {client.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <ul className="divide-y divide-dashed">
                {client.projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={href(`/panel/projects/${p.id}`)}
                      className="flex items-center gap-4 py-3 hover:text-primary"
                    >
                      <ColorDot color={p.color} />
                      <span className="flex-1 truncate font-semibold">{p.name}</span>
                      <Progress value={p.progress} className="hidden w-32 sm:block" />
                      <span className="w-10 text-xs font-bold">
                        {formatPercent(p.progress, locale)}
                      </span>
                      <ProjectStatusBadge status={p.status} t={t.projects} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{c.portalUsers}</CardTitle>
            <CardDescription>{c.portalUsersHint}</CardDescription>
            <CardAction>
              <InviteClientUser clientId={client.id} />
            </CardAction>
          </CardHeader>
          <CardContent>
            {client.users.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <ul className="divide-y divide-dashed">
                {client.users.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className="font-semibold">{u.name}</span>
                    <span className="text-muted-foreground" dir="ltr">
                      {u.email}
                    </span>
                    {u.disabled && <Badge variant="destructive">disabled</Badge>}
                    <span className="ms-auto text-xs text-muted-foreground">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt, fmt) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
