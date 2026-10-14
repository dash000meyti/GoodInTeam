import { getLocale } from "@/i18n/server";
import { requireActor } from "@/server/auth/session";
import { CommandPalette } from "./command-palette";
import { HeaderWidgets } from "./header-widgets";
import { PanelSidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

/** Session-dependent sidebar (rendered inside <Suspense> by the panel layout). */
export async function SessionSidebar() {
  const actor = await requireActor({ locale: await getLocale() });
  return (
    <>
      <PanelSidebar role={actor.user.role} />
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
