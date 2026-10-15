/**
 * Visual vocabulary of the calendar: icons and default colors per event kind
 * and per data source. Safe on server and client.
 */
import { createElement } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  BellIcon,
  CalendarIcon,
  CoffeeIcon,
  FlagIcon,
  FolderKanbanIcon,
  HandshakeIcon,
  MilestoneIcon,
  ReceiptIcon,
  SquareCheckIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import { eventKinds, type EventKind } from "@/server/db/enums";
import type { CalendarItem, CalendarSource } from "./types";

export { eventKinds };

export const kindMeta: Record<EventKind, { icon: LucideIcon; color: string }> = {
  meeting: { icon: UsersIcon, color: "#078DEE" },
  commitment: { icon: HandshakeIcon, color: "#FF5630" },
  deadline: { icon: FlagIcon, color: "#FFAB00" },
  focus: { icon: TargetIcon, color: "#00A76F" },
  reminder: { icon: BellIcon, color: "#8E33FF" },
  personal: { icon: CoffeeIcon, color: "#00B8D9" },
  other: { icon: CalendarIcon, color: "#637381" },
};

export const sourceMeta: Record<CalendarSource, { icon: LucideIcon; color: string }> = {
  events: { icon: CalendarIcon, color: "#078DEE" },
  commitments: { icon: HandshakeIcon, color: "#FF5630" },
  tasks: { icon: SquareCheckIcon, color: "#7635DC" },
  projects: { icon: FolderKanbanIcon, color: "#637381" },
  invoices: { icon: ReceiptIcon, color: "#FFAB00" },
};

/** Icon for any calendar item (event kind for events, source/type otherwise). */
export function itemIcon(item: Pick<CalendarItem, "type" | "event" | "source">): LucideIcon {
  if (item.type === "event" && item.event) return kindMeta[item.event.kind].icon;
  if (item.type === "milestone") return MilestoneIcon;
  return sourceMeta[item.source].icon;
}

/** Renders the icon of a calendar item (see `itemIcon`). */
export function ItemIcon({
  item,
  ...props
}: { item: Pick<CalendarItem, "type" | "event" | "source"> } & LucideProps) {
  return createElement(itemIcon(item), props);
}

/** Swatches offered in the event form (in addition to "automatic"). */
export const eventPalette = [
  "#00A76F",
  "#078DEE",
  "#7635DC",
  "#8E33FF",
  "#00B8D9",
  "#22C55E",
  "#FFAB00",
  "#FDA92D",
  "#FF5630",
  "#FF3030",
  "#637381",
];

/** Reminder offsets (minutes before) offered in the event form. */
export const reminderOptions = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080] as const;
