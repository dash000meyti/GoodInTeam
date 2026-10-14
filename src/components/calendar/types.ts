/**
 * Shared calendar types (server ⇄ client). Everything is plain JSON so it can
 * cross the RSC boundary: instants are epoch milliseconds (UTC).
 */
import type { EventKind, eventStatuses } from "@/server/db/schema/work";

export type EventStatus = (typeof eventStatuses)[number];

/** Toggleable data sources shown on the calendar. */
export const calendarSources = ["events", "commitments", "tasks", "projects", "invoices"] as const;
export type CalendarSource = (typeof calendarSources)[number];

/** Cookie remembering which sources the user switched off (comma-separated). */
export const HIDDEN_SOURCES_COOKIE = "gt_cal_hidden";

export const calendarViews = ["month", "week", "day", "agenda"] as const;
export type CalendarView = (typeof calendarViews)[number];

/** Commitment status as the UI/tools speak about it (stored as event status). */
export const commitmentStates = ["pending", "kept", "missed", "canceled"] as const;
export type CommitmentState = (typeof commitmentStates)[number];

export interface CalendarRef {
  id: string;
  name: string;
  color: string | null;
}

export interface Attendee {
  name: string;
  email?: string;
}

/** Full, editable data of a stored event (the series master for recurring events). */
export interface CalendarEventData {
  id: string;
  title: string;
  description: string | null;
  /** Plain-text excerpt of the markdown description (for popovers). */
  descriptionText: string | null;
  kind: EventKind;
  status: EventStatus;
  startAt: number;
  endAt: number | null;
  allDay: boolean;
  location: string | null;
  meetingUrl: string | null;
  projectId: string | null;
  clientId: string | null;
  promisedAt: number | null;
  color: string | null;
  recurrence: string | null;
  remindMinutesBefore: number | null;
  visibleToClient: boolean;
  attendees: Attendee[];
  canEdit: boolean;
}

/**
 * One thing to draw on the calendar: an event occurrence or a read-only
 * overlay (task due date, project / milestone due date, invoice due date).
 */
export interface CalendarItem {
  /** Unique per occurrence (recurring events produce several items). */
  key: string;
  source: CalendarSource;
  type: "event" | "task" | "project" | "milestone" | "invoice";
  /** Id of the underlying entity. */
  id: string;
  title: string;
  start: number;
  /** Exclusive end. All-day items end at the start of the day after their last day. */
  end: number;
  allDay: boolean;
  /** Resolved display color (event color → project color → kind/source default). */
  color: string;
  status: string | null;
  /** Completed / kept / paid — drawn struck through. */
  done: boolean;
  /** Panel-relative link for read-only overlays (e.g. /panel/tasks?task=…). */
  href: string | null;
  project: CalendarRef | null;
  client: CalendarRef | null;
  /** Present for `type === "event"`. */
  event: CalendarEventData | null;
  /** Outstanding amount (invoices). */
  amount: { minor: number; currency: string } | null;
}
