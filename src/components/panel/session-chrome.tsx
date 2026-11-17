import { cookies } from "next/headers";
import { connection } from "next/server";
import { OsClock } from "@/components/shell/os-clock";
import { getLocale, getMessages } from "@/i18n/server";
import { requireActor } from "@/server/auth/session";
import { getPublicTimezone } from "@/server/modules/content/queries";
import { HeaderWidgets } from "./header-widgets";
import { NavMenus } from "./menu-bar-menus";
import { PanelDock } from "./panel-dock";
import { defaultShell, readShellCookie, SHELL_COOKIE } from "./panel-prefs";
import { UserMenu } from "./user-menu";

/*
 * Session-dependent holes of the panel OS shell (spec §11.1). Each one is
 * rendered inside its own <Suspense> by the panel layout and calls
 * requireActor (cached per request), so the static frame stays prerendered.
 */

async function actor() {
  return requireActor({ locale: await getLocale() });
}

/** Role-filtered navigation menus, inside the menu bar's Radix Menubar root. */
export async function SessionMenus() {
  const a = await actor();
  return <NavMenus role={a.user.role} />;
}

/** Status items: running-timer pill (staff) and the notifications bell. */
export async function SessionStatus() {
  const a = await actor();
  return <HeaderWidgets actor={a} />;
}

export async function SessionAvatar() {
  const a = await actor();
  return <UserMenu user={a.user} />;
}

/** Studio clock (≥1280px), the business time zone. */
export async function SessionClock() {
  const locale = await getLocale();
  await requireActor({ locale });
  await connection();
  const tz = await getPublicTimezone();
  return <OsClock locale={locale} tz={tz} label={getMessages(locale).common.studioTime} />;
}

/** The dock (+ ⌘K palette, Launchpad, panel guide) with the server-read `gt-shell` prefs. */
export async function SessionDock() {
  const a = await actor();
  const value = (await cookies()).get(SHELL_COOKIE)?.value;
  const prefs = readShellCookie(value ? `${SHELL_COOKIE}=${value}` : null) ?? defaultShell;
  return <PanelDock role={a.user.role} prefs={prefs} />;
}

/** Reserves the timer (28px) and the bell (28px) so the streamed status never shifts the bar. */
export function StatusSkeleton() {
  return (
    <span className="pm-status-skeleton" aria-hidden>
      <span />
      <span />
    </span>
  );
}

export function AvatarSkeleton() {
  return <span className="os-avatar-skeleton" aria-hidden />;
}
