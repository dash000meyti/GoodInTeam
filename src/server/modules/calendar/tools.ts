import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import type { Actor } from "@/server/auth/actor";
import { appTimezone } from "@/server/modules/settings/service";
import { addDaysKey, dayKeyOf, dayStartMs } from "@/components/calendar/grid";
import { commitmentStates } from "@/components/calendar/types";
import { zId } from "@/lib/zod-helpers";
import { zonedParts } from "@/lib/tz";
import {
  agendaInput,
  commitmentInput,
  eventInput,
  idInput,
  isWhen,
  listCommitmentsInput,
  rangeInput,
  updateEventInput,
} from "./schemas";
import * as svc from "./service";

const STAFF = ["owner", "admin", "member"] as const;

const hhmm = (ms: number, tz: string) => {
  const p = zonedParts(ms, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
};

function listRange(actor: Actor, input: z.output<typeof rangeInput>) {
  const tz = appTimezone();
  const from = svc.parseWhen(input.from, tz).ms;
  const toWhen = svc.parseWhen(input.to, tz);
  // A day-only `to` is inclusive (the whole day).
  const to = toWhen.dayOnly ? dayStartMs(addDaysKey(input.to, 1), tz) : toWhen.ms;
  const items = svc.listCalendarItems(actor, { from, to, sources: input.sources });
  return {
    timezone: tz,
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    count: items.length,
    items: items.map((i) => ({
      id: i.id,
      type: i.type,
      source: i.source,
      kind: i.event?.kind ?? null,
      title: i.title,
      allDay: i.allDay,
      start: new Date(i.start).toISOString(),
      end: i.end > i.start ? new Date(i.end).toISOString() : null,
      localDate: dayKeyOf(i.start, tz),
      localTime: i.allDay ? null : hhmm(i.start, tz),
      status:
        i.event?.kind === "commitment" ? svc.toCommitmentState(i.event.status) : (i.status ?? null),
      recurring: !!i.event?.recurrence,
      project: i.project ? { id: i.project.id, name: i.project.name } : null,
      client: i.client ? { id: i.client.id, name: i.client.name } : null,
      location: i.event?.location ?? null,
      meetingUrl: i.event?.meetingUrl ?? null,
      link: i.href,
      amountDue: i.amount,
    })),
  };
}

const commitmentUpdateInput = z
  .object({
    id: zId,
    /** pending · kept · missed · canceled */
    status: z.enum(commitmentStates).optional(),
    /** Reschedule: new due ("YYYY-MM-DD", "YYYY-MM-DDTHH:mm" in the app timezone, or ISO 8601). */
    due: z.string().trim().max(40).refine(isWhen, "Invalid date").optional(),
    dueTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
  })
  .refine((v) => v.status || v.due, { message: "Provide `status` and/or `due`" });

export const calendarTools = [
  defineTool({
    name: "calendar_list",
    title: "List calendar",
    description:
      "Everything on the calendar between `from` and `to`: events (recurring ones expanded into occurrences), commitments (promises made to clients/teams), task due dates, project & milestone due dates and — for admins — invoice due dates. `from`/`to` accept 'YYYY-MM-DD' (app timezone; a day-only `to` includes that whole day) or ISO 8601. Max range 366 days. Optional `sources`: events, commitments, tasks, projects, invoices.",
    input: rangeInput,
    scope: "read",
    roles: [...STAFF],
    handler: (input, actor) => listRange(actor, input),
  }),
  defineTool({
    name: "calendar_agenda",
    title: "Agenda",
    description:
      "Concise day-by-day agenda for today (days=1) or the next N days (max 31): meetings, commitments, deadlines, focus blocks, task/project/invoice due dates, with local times in the app timezone. Returns structured `days` plus a ready-to-read `text` summary. Use this to answer 'what do I have today / this week?'.",
    input: agendaInput,
    scope: "read",
    roles: [...STAFF],
    handler: (input, actor) => svc.agenda(actor, input),
  }),
  defineTool({
    name: "calendar_get_event",
    title: "Get event",
    description:
      "Full details of one calendar event or commitment (times in UTC + local wall clock, recurrence RRULE, attendees, project/client).",
    input: idInput,
    scope: "read",
    roles: [...STAFF],
    handler: ({ id }, actor) => svc.eventToJson(svc.getEvent(actor, id)),
  }),
  defineTool({
    name: "calendar_create_event",
    title: "Create event",
    description:
      "Create a calendar event. kind: meeting | commitment | deadline | focus | reminder | personal | other. Timing: either `date` ('YYYY-MM-DD') + `startTime`/`endTime` ('HH:mm', app timezone; allDay=true ignores times; `endDate` = last day of a multi-day event), or `startAt`/`endAt` (ISO 8601 or 'YYYY-MM-DDTHH:mm'). Optional: location, meetingUrl, projectId, clientId (admins), promisedAt (commitments: when the promise was made, defaults to now), description (markdown), color '#RRGGBB', recurrence (RRULE such as 'FREQ=WEEKLY;BYDAY=SA'), remindMinutesBefore, visibleToClient, attendees [{name, email}].",
    input: eventInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.eventToJson(svc.getEvent(actor, svc.createEvent(actor, input).id)),
  }),
  defineTool({
    name: "calendar_update_event",
    title: "Update event",
    description:
      "Update any field of an event (partial). Changing only `startAt` (or `date`/`startTime`) keeps the event's duration. For recurring events the whole series is changed. Members can only change events they created.",
    input: updateEventInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.eventToJson(svc.getEvent(actor, svc.updateEvent(actor, input).id)),
  }),
  defineTool({
    name: "calendar_delete_event",
    title: "Delete event",
    description:
      "Permanently delete an event or commitment (for recurring events: the whole series). Prefer calendar_set_commitment_status with status 'canceled' to keep a commitment's history.",
    input: idInput,
    scope: "write",
    roles: [...STAFF],
    destructive: true,
    handler: ({ id }, actor) => svc.deleteEvent(actor, id),
  }),
  defineTool({
    name: "calendar_list_commitments",
    title: "List commitments",
    description:
      "Commitments = promises made to a client/team (what, to whom, when promised, due). Filter by status: all | pending | overdue | upcoming | kept | missed | canceled, and by clientId / projectId. Includes promise-keeping stats: keepRate = kept / (kept + missed), per-client rates and average lead time in days (due − promisedAt). Use for 'what did I promise Acme this week?'.",
    input: listCommitmentsInput,
    scope: "read",
    roles: [...STAFF],
    handler: (input, actor) => svc.listCommitmentsJson(actor, input),
  }),
  defineTool({
    name: "calendar_create_commitment",
    title: "Create commitment",
    description:
      "Record a promise: `title` = what was promised, `clientId` = to whom (see clients_list; members may pass projectId instead and the project's client is used), `due` = 'YYYY-MM-DD' (all-day), 'YYYY-MM-DDTHH:mm' (app timezone) or ISO 8601 (optionally `dueTime` 'HH:mm' with a day), `promisedAt` defaults to now.",
    input: commitmentInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) =>
      svc.eventToJson(svc.getEvent(actor, svc.createCommitment(actor, input).id)),
  }),
  defineTool({
    name: "calendar_set_commitment_status",
    title: "Set commitment status",
    description:
      "Mark a commitment as kept, missed, canceled or back to pending — and/or reschedule it by passing a new `due` (keeps its time of day unless `dueTime` is given; a missed commitment becomes pending again).",
    input: commitmentUpdateInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => {
      if (input.due) svc.rescheduleCommitment(actor, { id: input.id, due: input.due, dueTime: input.dueTime });
      if (input.status) svc.setCommitmentStatus(actor, { id: input.id, status: input.status });
      return svc.eventToJson(svc.getEvent(actor, input.id));
    },
  }),
];
