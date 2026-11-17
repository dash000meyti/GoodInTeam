import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckSquareIcon,
  FileSignatureIcon,
  FolderKanbanIcon,
  ImageIcon,
  InboxIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  NewspaperIcon,
  PaletteIcon,
  ReceiptIcon,
  SettingsIcon,
  TimerIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { PixelIconName } from "@/components/brand/pixel-icons";
import type { UserRole } from "@/server/db/schema/auth";
import type { Messages } from "@/i18n/messages";

export interface NavItem {
  /** Path under the panel, e.g. "/panel/time" (locale prefix is added at render). */
  href: string;
  label: keyof Messages["nav"];
  /** 16–24px lucide icon: menus, ⌘K, window title, lists. */
  icon: LucideIcon;
  /**
   * 12×12 pixel module icon (`PixelIcon`, cell 2 = 24px): the dock, the tab
   * bar and the Launchpad. Falls back to `icon` when missing.
   */
  pixel?: PixelIconName;
  roles: readonly UserRole[];
  /** Match only the exact path (for /panel). */
  exact?: boolean;
}

export interface NavGroup {
  label: keyof Messages["nav"];
  items: NavItem[];
}

const STAFF = ["owner", "admin", "member"] as const;
const ADMIN = ["owner", "admin"] as const;
const CLIENT = ["client"] as const;
const ALL = ["owner", "admin", "member", "client"] as const;

/**
 * Single source of truth for the panel dock, menu-bar menus, Launchpad and
 * command palette. Add a module: add an item here (a lucide `icon` and a
 * `pixel` icon drawn into `panelIcons`, brand/pixel-icons.ts), create
 * src/app/[locale]/panel/<module>/page.tsx (+ loading.tsx) and a
 * `guide.panel_<label>` tip.
 */
export const panelNav: NavGroup[] = [
  {
    label: "groupOverview",
    items: [
      {
        href: "/panel",
        label: "dashboard",
        icon: LayoutDashboardIcon,
        pixel: "dashboard",
        roles: STAFF,
        exact: true,
      },
      {
        href: "/panel",
        label: "portalHome",
        icon: LayoutDashboardIcon,
        pixel: "portal",
        roles: CLIENT,
        exact: true,
      },
    ],
  },
  {
    label: "groupWork",
    items: [
      { href: "/panel/time", label: "time", icon: TimerIcon, pixel: "time", roles: STAFF },
      {
        href: "/panel/calendar",
        label: "calendar",
        icon: CalendarDaysIcon,
        pixel: "calendar",
        roles: STAFF,
      },
      { href: "/panel/tasks", label: "tasks", icon: CheckSquareIcon, pixel: "tasks", roles: STAFF },
      {
        href: "/panel/projects",
        label: "projects",
        icon: FolderKanbanIcon,
        pixel: "projects",
        roles: ALL,
      },
    ],
  },
  {
    label: "groupBusiness",
    items: [
      { href: "/panel/clients", label: "clients", icon: UsersIcon, pixel: "clients", roles: ADMIN },
      {
        href: "/panel/finance",
        label: "finance",
        icon: WalletIcon,
        pixel: "finance",
        roles: ADMIN,
      },
      {
        href: "/panel/invoices",
        label: "invoices",
        icon: ReceiptIcon,
        pixel: "invoices",
        roles: ALL,
      },
      {
        href: "/panel/contracts",
        label: "contracts",
        icon: FileSignatureIcon,
        pixel: "contracts",
        roles: ["owner", "admin", "client"],
      },
    ],
  },
  {
    label: "groupKnowledge",
    items: [
      { href: "/panel/docs", label: "docs", icon: BookOpenIcon, pixel: "docs", roles: STAFF },
      { href: "/panel/vault", label: "vault", icon: KeyRoundIcon, pixel: "vault", roles: STAFF },
    ],
  },
  {
    label: "groupSite",
    items: [
      {
        href: "/panel/content",
        label: "content",
        icon: NewspaperIcon,
        pixel: "content",
        roles: ADMIN,
      },
      { href: "/panel/inbox", label: "inbox", icon: InboxIcon, pixel: "inbox", roles: ADMIN },
      { href: "/panel/media", label: "media", icon: ImageIcon, pixel: "media", roles: ADMIN },
    ],
  },
  {
    label: "groupSystem",
    items: [
      {
        href: "/panel/settings",
        label: "settings",
        icon: SettingsIcon,
        pixel: "settings",
        roles: ALL,
      },
      {
        href: "/panel/design-system",
        label: "designSystem",
        icon: PaletteIcon,
        pixel: "design-system",
        roles: ADMIN,
      },
    ],
  },
];

export function navForRole(role: UserRole): NavGroup[] {
  return panelNav
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
}

/**
 * The mobile tab bar (<1024px, spec §11.3): staff get 4 pins plus "More"
 * (Launchpad); clients get exactly 5 pins and no More.
 */
export const mobilePins: Record<UserRole, (keyof Messages["nav"])[]> = {
  owner: ["dashboard", "tasks", "time", "projects"],
  admin: ["dashboard", "tasks", "time", "projects"],
  member: ["dashboard", "tasks", "time", "projects"],
  client: ["portalHome", "projects", "invoices", "contracts", "settings"],
};

/**
 * The module a panel path belongs to: longest-prefix match over every
 * `panelNav` item except the `/panel` overview (role-neutral, so the static
 * menu bar and window title can use it). `null` for `/panel` itself and for
 * paths outside the nav. `path` is unprefixed (`stripLocale(...).path`).
 */
export function matchNav(path: string): NavItem | null {
  const clean = path.replace(/\/+$/, "") || "/";
  let best: NavItem | null = null;
  for (const g of panelNav)
    for (const item of g.items) {
      if (item.href === "/panel") continue;
      if (clean !== item.href && !clean.startsWith(`${item.href}/`)) continue;
      if (!best || item.href.length > best.href.length) best = item;
    }
  return best;
}

/** The nav key of the active module for a role (`/panel` → dashboard or portalHome). */
export function navKeyFor(path: string, role: UserRole): keyof Messages["nav"] {
  return matchNav(path)?.label ?? (role === "client" ? "portalHome" : "dashboard");
}

// Re-exported icons used by pages for consistent iconography.
export const moduleIcons = {
  time: TimerIcon,
  calendar: CalendarDaysIcon,
  tasks: CheckSquareIcon,
  projects: FolderKanbanIcon,
  clients: UsersIcon,
  finance: WalletIcon,
  invoices: ReceiptIcon,
  contracts: FileSignatureIcon,
  docs: BookOpenIcon,
  vault: KeyRoundIcon,
  content: NewspaperIcon,
  inbox: InboxIcon,
  media: ImageIcon,
  settings: SettingsIcon,
  designSystem: LayoutTemplateIcon,
  work: BriefcaseIcon,
} as const;
