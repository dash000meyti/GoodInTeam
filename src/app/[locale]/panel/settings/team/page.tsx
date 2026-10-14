import Link from "next/link";
import { ArrowUpRightIcon, Building2Icon, UsersRoundIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ColorDot } from "@/components/shared/color-dot";
import { EmptyState } from "@/components/panel/empty-state";
import { format } from "@/i18n/format-message";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import { isOwner } from "@/server/auth/actor";
import type { UserRole } from "@/server/db/schema/auth";
import { listUsers } from "@/server/modules/users/service";
import { panelContext, type PanelContext } from "@/server/page-context";
import { SettingsCard, SettingsHeader } from "../_components/section";
import { InviteMemberDialog, UserActions } from "../_components/team-actions";

type UserRow = Awaited<ReturnType<typeof listUsers>>[number];

const roleVariant: Record<UserRole, "default" | "violet" | "info" | "neutral"> = {
  owner: "default",
  admin: "violet",
  member: "info",
  client: "neutral",
};

function UserLine({ u, ctx }: { u: UserRow; ctx: PanelContext }) {
  const { actor, t, fmt, now, href } = ctx;
  const s = t.settings;
  const self = u.id === actor.user.id;
  const canManage = !self && (u.role !== "owner" || isOwner(actor));
  const shown = u.projects.slice(0, 3);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
        <Avatar className={cn("size-10", u.disabled && "opacity-50 grayscale")}>
          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt="" className="object-cover" />}
          <AvatarFallback>{initials(u.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("truncate font-semibold", u.disabled && "text-muted-foreground")}>
              {u.name}
            </span>
            {self && <Badge variant="outline">{s.you}</Badge>}
            <Badge variant={roleVariant[u.role]}>{t.panel[`role_${u.role}`]}</Badge>
            {u.disabled && <Badge variant="destructive">{s.statusDisabled}</Badge>}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            <span dir="ltr">{u.email}</span>
            {u.title && <span> · {u.title}</span>}
          </p>
        </div>
      </div>

      {u.role !== "client" && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:basis-56">
          {u.role === "member" && shown.length === 0 ? (
            <span className="text-xs text-muted-foreground">{s.noAssignedProjects}</span>
          ) : (
            shown.map((p) => (
              <Link
                key={p.id}
                href={href(`/panel/projects/${p.id}`)}
                className="inline-flex max-w-40 items-center gap-1.5 rounded-md border border-dashed px-2 py-0.5 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary"
              >
                <ColorDot color={p.color} className="size-2" />
                <span className="truncate">{p.name}</span>
              </Link>
            ))
          )}
          {u.projects.length > 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default rounded-md bg-muted px-1.5 py-0.5 text-xs font-bold text-muted-foreground">
                  +{formatNumber(u.projects.length - 3, fmt.locale)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {u.projects
                  .slice(3)
                  .map((p) => p.name)
                  .join(fmt.locale === "fa" ? "، " : ", ")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      <div className="w-36 shrink-0 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground/80">{s.lastLogin}</p>
        {u.lastLoginAt ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <time dateTime={u.lastLoginAt.toISOString()}>
                {formatRelative(u.lastLoginAt, fmt, now)}
              </time>
            </TooltipTrigger>
            <TooltipContent>{formatDateTime(u.lastLoginAt, fmt)}</TooltipContent>
          </Tooltip>
        ) : (
          <span>{s.neverSignedIn}</span>
        )}
        {u.activeSessions > 0 && (
          <p className="text-success">
            {format(s.activeSessions, { n: formatNumber(u.activeSessions, fmt.locale) })}
          </p>
        )}
      </div>

      <div className="ms-auto flex w-8 justify-end">
        {canManage && (
          <UserActions
            user={{ id: u.id, name: u.name, role: u.role, disabled: u.disabled }}
            actorIsOwner={isOwner(actor)}
          />
        )}
      </div>
    </li>
  );
}

/** Settings → Team & users (owner/admin). */
export default async function TeamSettingsPage() {
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, fmt } = ctx;
  const s = t.settings;
  const all = await listUsers(actor);
  const team = all.filter((u) => u.role !== "client");
  const portal = all.filter((u) => u.role === "client");
  const byClient = new Map<string, { client: UserRow["client"]; users: UserRow[] }>();
  for (const u of portal) {
    const key = u.client?.id ?? "—";
    const g = byClient.get(key) ?? { client: u.client, users: [] };
    g.users.push(u);
    byClient.set(key, g);
  }

  return (
    <div className="space-y-6">
      <SettingsHeader title={s.teamTitle} description={s.teamSubtitle} />

      <SettingsCard
        icon={UsersRoundIcon}
        title={s.team}
        description={`${format(s.teamCount, { n: formatNumber(team.length, fmt.locale) })} · ${s.membersManagedOnProject}`}
        action={<InviteMemberDialog />}
      >
        <ul className="divide-y divide-dashed">
          {team.map((u) => (
            <UserLine key={u.id} u={u} ctx={ctx} />
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard icon={Building2Icon} title={s.portalUsers} description={s.portalUsersHint}>
        {portal.length === 0 ? (
          <EmptyState
            icon={Building2Icon}
            title={s.noPortalUsers}
            description={s.noPortalUsersHint}
            className="py-10"
          />
        ) : (
          <div className="space-y-5">
            {[...byClient.values()].map((g) => (
              <section
                key={g.client?.id ?? "none"}
                className="rounded-2xl border border-dashed p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <ColorDot color={g.client?.color} />
                  <h3 className="flex-1 truncate text-sm font-bold">{g.client?.name ?? "—"}</h3>
                  {g.client && (
                    <Link
                      href={href(`/panel/clients/${g.client.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {s.openClient}
                      <ArrowUpRightIcon className="size-3.5 rtl:-scale-x-100" />
                    </Link>
                  )}
                </div>
                <ul className="divide-y divide-dashed">
                  {g.users.map((u) => (
                    <UserLine key={u.id} u={u} ctx={ctx} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
