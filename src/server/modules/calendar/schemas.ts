import { z } from "zod";
import { eventKinds, eventStatuses } from "@/server/db/schema";
import { calendarSources, commitmentStates } from "@/components/calendar/types";
import { parseRRule } from "@/lib/rrule";
import { zBool, zColor, zId, zNullString, zOptString } from "@/lib/zod-helpers";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOCAL_DT_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;

/** "" / null → null (clear), undefined → not provided. */
const blankToNull = (v: unknown) => (v === "" ? null : v);
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

/** True for "YYYY-MM-DD", "YYYY-MM-DDTHH:mm" (wall clock in the app timezone) or ISO 8601. */
export function isWhen(v: string) {
  if (DAY_RE.test(v) || LOCAL_DT_RE.test(v)) return true;
  return /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v));
}

const zDay = z.string().trim().regex(DAY_RE, "YYYY-MM-DD");
const zTime = z.string().trim().regex(TIME_RE, "HH:mm");
const zWhen = z
  .string()
  .trim()
  .max(40)
  .refine(isWhen, "Use YYYY-MM-DD, YYYY-MM-DDTHH:mm or an ISO 8601 date-time");

const zOptDay = z.preprocess(blankToUndefined, zDay.optional());
const zNullDay = z.preprocess(blankToNull, zDay.nullable().optional());
const zNullTime = z.preprocess(blankToNull, zTime.nullable().optional());
const zOptWhen = z.preprocess(blankToUndefined, zWhen.optional());
const zNullWhen = z.preprocess(blankToNull, zWhen.nullable().optional());

const zNullUrl = z.preprocess(
  blankToNull,
  z
    .url({ protocol: /^https?$/ })
    .max(2000)
    .nullable()
    .optional(),
);
const zNullColor = z.preprocess(blankToNull, zColor.nullable().optional());
const zNullMinutes = z.preprocess(
  (v) => (v === "" || v === null ? null : typeof v === "string" ? Number(v) : v),
  z.number().int().min(0).max(40_320).nullable().optional(),
);
const zRecurrence = z.preprocess(
  blankToNull,
  z
    .string()
    .trim()
    .max(500)
    .refine((v) => parseRRule(v) !== null, "Invalid RRULE (e.g. FREQ=WEEKLY;BYDAY=SA)")
    .nullable()
    .optional(),
);

const attendee = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.preprocess(blankToUndefined, z.email().max(320).optional()),
});
/** Array of {name, email?} — or a JSON string of it (hidden form input). */
const zAttendees = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  if (!v.trim()) return [];
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}, z.array(attendee).max(100));

/**
 * Event fields. Timing can be given either as form-style fields
 * (`date` + `startTime`/`endTime`, optional `endDate`) or as `startAt`/`endAt`.
 */
const eventFields = z.object({
  title: z.string().trim().min(1).max(300),
  kind: z.enum(eventKinds),
  /** tentative · confirmed (commitment: pending) · done (commitment: kept) · missed · canceled */
  status: z.enum(eventStatuses),
  allDay: zBool,
  /** Day of the (first) occurrence, "YYYY-MM-DD" in the app timezone. */
  date: zOptDay,
  /** "HH:mm" (24h) in the app timezone. Ignored for all-day events. */
  startTime: zNullTime,
  /** "HH:mm". An end before the start means the event ends the next day. */
  endTime: zNullTime,
  /** Last day (inclusive) of a multi-day event. */
  endDate: zNullDay,
  /** Alternative to date/startTime: ISO 8601 instant, "YYYY-MM-DDTHH:mm" (app tz) or a day (all-day). */
  startAt: zOptWhen,
  endAt: zNullWhen,
  location: zNullString(300),
  meetingUrl: zNullUrl,
  projectId: zNullString(64),
  /** The client/team (for commitments: whom the promise was made to). Admins only. */
  clientId: zNullString(64),
  /** Commitments: when the promise was made (day or date-time). */
  promisedAt: zNullWhen,
  description: zNullString(20_000),
  color: zNullColor,
  /** RFC 5545 RRULE, e.g. "FREQ=WEEKLY;BYDAY=SA". */
  recurrence: zRecurrence,
  remindMinutesBefore: zNullMinutes,
  visibleToClient: zBool,
  attendees: zAttendees,
});

export const eventInput = eventFields
  .extend({
    kind: z.enum(eventKinds).default("meeting"),
    status: z.enum(eventStatuses).optional(),
    allDay: zBool.default(false),
    visibleToClient: zBool.default(false),
    attendees: zAttendees.optional(),
  })
  .refine((v) => v.date || v.startAt, {
    path: ["date"],
    message: "Provide `date` (YYYY-MM-DD) or `startAt`",
  });
export type EventInput = z.output<typeof eventInput>;

export const updateEventInput = eventFields.partial().extend({ id: zId });
export type UpdateEventInput = z.output<typeof updateEventInput>;

export const rangeInput = z.object({
  /** Range start: "YYYY-MM-DD" (app timezone) or ISO 8601. */
  from: zWhen,
  /** Range end (exclusive): "YYYY-MM-DD" or ISO 8601. Max 366 days after `from`. */
  to: zWhen,
  sources: z.array(z.enum(calendarSources)).optional(),
});

export const agendaInput = z.object({
  /** Number of days to list, starting today (or `from`). 1 = just today. */
  days: z.coerce.number().int().min(1).max(31).default(1),
  from: zOptDay,
  includeTasks: z.boolean().default(true),
});

export const commitmentInput = z.object({
  /** What was promised. */
  title: z.string().trim().min(1).max(300),
  /** To whom (client / team). */
  clientId: zNullString(64),
  projectId: zNullString(64),
  /** Due: "YYYY-MM-DD" (all-day), "YYYY-MM-DDTHH:mm" (app tz) or ISO 8601. */
  due: zWhen,
  /** Optional "HH:mm" combined with a day-only `due` (quick form). */
  dueTime: z.preprocess(blankToUndefined, zTime.optional()),
  /** When the promise was made; defaults to now. */
  promisedAt: zOptWhen,
  description: zNullString(20_000),
  visibleToClient: zBool.default(false),
});

export const commitmentStatusInput = z.object({
  id: zId,
  status: z.enum(commitmentStates),
});

export const rescheduleCommitmentInput = z.object({
  id: zId,
  due: zWhen,
  dueTime: z.preprocess(blankToUndefined, zTime.optional()),
});

export const commitmentFilters = [
  "all",
  "pending",
  "overdue",
  "upcoming",
  "kept",
  "missed",
  "canceled",
] as const;

export const listCommitmentsInput = z.object({
  status: z.enum(commitmentFilters).default("all"),
  clientId: zOptString(64),
  projectId: zOptString(64),
});

export const idInput = z.object({ id: zId });
