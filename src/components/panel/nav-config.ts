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
import type { UserRole } from "@/server/db/schema/auth";
import type { Messages } from "@/i18n/messages";

export interface NavItem {
  /** Path under the panel, e.g. "/panel/time" (locale prefix is added at render). */
  href: string;
  label: keyof Messages["nav"];
  icon: LucideIcon;
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
 * Single source of truth for the panel sidebar + command palette.
 * Add a module: add an item here, create src/app/[locale]/panel/<module>/page.tsx.
 */
export const panelNav: NavGroup[] = [
  {
    label: "groupOverview",
    items: [
      { href: "/panel", label: "dashboard", icon: LayoutDashboardIcon, roles: STAFF, exact: true },
      {
        href: "/panel",
        label: "portalHome",
        icon: LayoutDashboardIcon,
        roles: CLIENT,
        exact: true,
      },
    ],
  },
  {
    label: "groupWork",
    items: [
      { href: "/panel/time", label: "time", icon: TimerIcon, roles: STAFF },
      { href: "/panel/calendar", label: "calendar", icon: CalendarDaysIcon, roles: STAFF },
      { href: "/panel/tasks", label: "tasks", icon: CheckSquareIcon, roles: STAFF },
      { href: "/panel/projects", label: "projects", icon: FolderKanbanIcon, roles: ALL },
    ],
  },
  {
    label: "groupBusiness",
    items: [
      { href: "/panel/clients", label: "clients", icon: UsersIcon, roles: ADMIN },
      { href: "/panel/finance", label: "finance", icon: WalletIcon, roles: ADMIN },
      { href: "/panel/invoices", label: "invoices", icon: ReceiptIcon, roles: ALL },
      { href: "/panel/contracts", label: "contracts", icon: FileSignatureIcon, roles: ALL },
    ],
  },
  {
    label: "groupKnowledge",
    items: [
      { href: "/panel/docs", label: "docs", icon: BookOpenIcon, roles: STAFF },
      { href: "/panel/vault", label: "vault", icon: KeyRoundIcon, roles: STAFF },
    ],
  },
  {
    label: "groupSite",
    items: [
      { href: "/panel/content", label: "content", icon: NewspaperIcon, roles: ADMIN },
      { href: "/panel/inbox", label: "inbox", icon: InboxIcon, roles: ADMIN },
      { href: "/panel/media", label: "media", icon: ImageIcon, roles: ADMIN },
    ],
  },
  {
    label: "groupSystem",
    items: [
      { href: "/panel/settings", label: "settings", icon: SettingsIcon, roles: ALL },
      { href: "/panel/design-system", label: "designSystem", icon: PaletteIcon, roles: ADMIN },
    ],
  },
];

export function navForRole(role: UserRole): NavGroup[] {
  return panelNav
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
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
