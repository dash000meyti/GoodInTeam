import { HeaderLive } from "@/components/notifications/header-live";
import { isStaff, type Actor } from "@/server/auth/actor";
import { headerSnapshot } from "@/server/modules/notifications/header";
import { appTimezone } from "@/server/modules/settings/service";
import { timeProjectOptions } from "@/server/modules/time/service";

/**
 * Extension point: session-aware widgets shown in the panel top bar,
 * before the user menu (e.g. running timers, notifications).
 * Modules add their widget here.
 */
export async function HeaderWidgets({ actor }: { actor: Actor }) {
  const staff = isStaff(actor);
  const snapshot = await headerSnapshot(actor);
  const projects = staff
    ? timeProjectOptions(actor).map(({ id, name, color }) => ({ id, name, color }))
    : [];
  return (
    <HeaderLive initial={snapshot} projects={projects} tz={appTimezone()} showTimers={staff} />
  );
}
