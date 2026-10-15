import { cookies } from "next/headers";
import { getLocale } from "@/i18n/server";
import { requireActor } from "@/server/auth/session";
import { CommandPalette } from "./command-palette";
import { HeaderWidgets } from "./header-widgets";
import { SIDEBAR_COOKIE } from "./panel-prefs";
import { PanelSidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

/**
 * Session-dependent sidebar (rendered inside <Suspense> by the panel layout). Reads the
 * collapsed-sidebar cookie here (request time) so the server HTML has the final width.
 */
export async function SessionSidebar() {
  const actor = await requireActor({ locale: await getLocale() });
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";
  return (
    <>
      <PanelSidebar role={actor.user.role} defaultCollapsed={collapsed} />
      <CommandPalette role={actor.user.role} />
    </>
  );
}

/** Session-dependent header widgets (timers, notifications, user menu). */
export async function SessionHeaderSlot() {
  const actor = await requireActor({ locale: await getLocale() });
  return (
    <>
      <HeaderWidgets actor={actor} />
      <UserMenu user={actor.user} />
    </>
  );
}

export function HeaderSlotSkeleton() {
  return <div className="size-9 animate-pulse rounded-full bg-grey-500/12" />;
}
