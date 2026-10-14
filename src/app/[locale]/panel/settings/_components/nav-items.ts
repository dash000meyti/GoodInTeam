import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  BriefcaseIcon,
  DatabaseBackupIcon,
  IdCardIcon,
  PaletteIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";
import type { UserRole } from "@/server/db/schema/auth";

export interface SettingsNavItem {
  href: string;
  key: "account" | "security" | "appearance" | "api" | "profile" | "business" | "team" | "data";
  icon: LucideIcon;
  roles: readonly UserRole[];
  exact?: boolean;
}

const ALL = ["owner", "admin", "member", "client"] as const;
const STAFF = ["owner", "admin", "member"] as const;
const ADMIN = ["owner", "admin"] as const;
const OWNER = ["owner"] as const;

/** Settings sections. Each page also enforces its roles via panelContext(). */
export const settingsNav: {
  group: "groupPersonal" | "groupWorkspace";
  items: SettingsNavItem[];
}[] = [
  {
    group: "groupPersonal",
    items: [
      { href: "/panel/settings", key: "account", icon: UserRoundIcon, roles: ALL, exact: true },
      { href: "/panel/settings/security", key: "security", icon: ShieldCheckIcon, roles: ALL },
      { href: "/panel/settings/appearance", key: "appearance", icon: PaletteIcon, roles: ALL },
      { href: "/panel/settings/api", key: "api", icon: BotIcon, roles: STAFF },
    ],
  },
  {
    group: "groupWorkspace",
    items: [
      { href: "/panel/settings/profile", key: "profile", icon: IdCardIcon, roles: ADMIN },
      { href: "/panel/settings/business", key: "business", icon: BriefcaseIcon, roles: ADMIN },
      { href: "/panel/settings/team", key: "team", icon: UsersRoundIcon, roles: ADMIN },
      { href: "/panel/settings/data", key: "data", icon: DatabaseBackupIcon, roles: OWNER },
    ],
  },
];

export function settingsNavFor(role: UserRole) {
  return settingsNav
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
}
