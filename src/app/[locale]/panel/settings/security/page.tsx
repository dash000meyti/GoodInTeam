import {
  BotIcon,
  MonitorIcon,
  MonitorSmartphoneIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TabletIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/panel/empty-state";
import { format } from "@/i18n/format-message";
import { formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { currentSessionId, listMySessions } from "@/server/modules/auth/sessions";
import { userAgentLabel, type DeviceType } from "@/server/modules/auth/user-agent";
import { panelContext } from "@/server/page-context";
import { SettingsCard, SettingsHeader } from "../_components/section";
import { SecurityTabs } from "../_components/security-tabs";
import { RevokeSessionButton, SignOutOthersButton } from "../_components/session-actions";

const deviceIcon: Record<DeviceType, typeof MonitorIcon> = {
  desktop: MonitorIcon,
  mobile: SmartphoneIcon,
  tablet: TabletIcon,
  bot: BotIcon,
  unknown: MonitorSmartphoneIcon,
};

/** Settings → Sessions & security (every role). */
export default async function SecuritySettingsPage() {
  const { actor, t, fmt, href, now } = await panelContext();
  const s = t.settings;
  const list = listMySessions(actor, await currentSessionId());
  const others = list.filter((x) => !x.current).length;

  return (
    <div className="space-y-6">
      <SettingsHeader
        title={s.securityTitle}
        description={s.securitySubtitle}
        actions={<SecurityTabs active="sessions" href={href} t={s} />}
      />
      <SettingsCard
        icon={ShieldCheckIcon}
        title={s.sessionsTitle}
        description={s.sessionsHint}
        action={<SignOutOthersButton disabled={others === 0} />}
      >
        <ul className="divide-y divide-dashed">
          {list.map((session) => {
            const Icon = deviceIcon[session.agent.device];
            const label = userAgentLabel(
              session.agent,
              (p) => format(s.deviceLabel, p),
              s.unknownDevice,
            );
            const recent = now - session.lastSeenAt.getTime() < 10 * 60_000;
            return (
              <li
                key={session.id}
                className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    session.current
                      ? "bg-primary/12 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{label}</span>
                    {session.agent.version && (
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        v{session.agent.version}
                      </span>
                    )}
                    {session.current && <Badge variant="success">{s.thisDevice}</Badge>}
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {session.ip && (
                      <span dir="ltr" className="font-mono">
                        {session.ip}
                      </span>
                    )}
                    <span>
                      {format(s.signedInAt, { date: formatDate(session.createdAt, fmt) })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {(session.current || recent) && (
                        <span className="size-1.5 rounded-full bg-success" aria-hidden />
                      )}
                      {session.current || recent
                        ? s.activeNow
                        : format(s.lastSeen, {
                            time: formatRelative(session.lastSeenAt, fmt, now),
                          })}
                    </span>
                  </p>
                </div>
                {!session.current && <RevokeSessionButton id={session.id} />}
              </li>
            );
          })}
        </ul>
        {others === 0 && (
          <EmptyState
            icon={ShieldCheckIcon}
            title={s.onlyThisDevice}
            description={s.onlyThisDeviceHint}
            className="mt-5 py-8"
          />
        )}
      </SettingsCard>
    </div>
  );
}
