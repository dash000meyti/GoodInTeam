import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import {
  entryIdInput,
  entryInput,
  listEntriesInput,
  reportInput,
  startTimerInput,
  stopTimerInput,
  updateEntryInput,
} from "./schemas";
import * as svc from "./service";

const STAFF = ["owner", "admin", "member"] as const;

const TIMES_HELP =
  "Times can be given as: (a) date 'YYYY-MM-DD' + startTime 'HH:mm' + endTime 'HH:mm' (24h, app timezone; an endTime earlier than startTime means it ended after midnight), " +
  "(b) date + startTime + duration, (c) date + duration (placed after that day's last entry), or (d) startedAt + endedAt as ISO 8601 instants. " +
  "duration accepts '1:30' (h:mm), '90m', '1.5h' or a bare number of hours.";

export const timeTools = [
  defineTool({
    name: "time_start_timer",
    title: "Start timer",
    description:
      "Start a running timer for the caller now. Several timers may run in parallel (e.g. two projects at once) — starting one never stops another. " +
      "Optional projectId (see projects_list), taskId (see tasks_list; implies its project) and description. billable defaults to true unless the project is 'internal'. " +
      "The project's hourly rate is snapshotted onto the entry. Returns the entry (startedAt ISO).",
    input: startTimerInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.startTimer(actor, input),
  }),
  defineTool({
    name: "time_stop_timer",
    title: "Stop timer",
    description:
      "Stop a running timer by entry id, or pass id 'all' to stop every running timer of the caller. Optional endedAt (ISO 8601) to stop at an earlier time. " +
      "Use time_list_running first to find ids.",
    input: stopTimerInput,
    scope: "write",
    roles: [...STAFF],
    handler: ({ id, endedAt }, actor) =>
      id === "all"
        ? { stopped: svc.stopAllTimers(actor) }
        : { stopped: 1, entry: svc.stopTimer(actor, id, endedAt) },
  }),
  defineTool({
    name: "time_list_running",
    title: "List running timers",
    description:
      "The caller's running timers (oldest first) with project and task. Elapsed time = now − startedAt.",
    input: z.object({}),
    scope: "read",
    roles: [...STAFF],
    handler: async (_input, actor) => {
      const now = Date.now();
      const rows = await svc.listRunning(actor);
      return rows.map((r) => ({ ...r, elapsedMs: now - r.startedAt.getTime() }));
    },
  }),
  defineTool({
    name: "time_list_entries",
    title: "List time entries",
    description:
      "Time entries overlapping a range, newest first. from/to are 'YYYY-MM-DD' (app timezone, to is inclusive) or ISO instants. " +
      "Each entry has durationMs (milliseconds; running timers count up to now), billable, and for admins hourlyRateMinor/currency/earnedMinor (minor units). " +
      "Members only see their own time; owner/admin may pass userId (a user id or 'all'). projectId '_none' = entries without a project. limit ≤ 2000 (default 500).",
    input: listEntriesInput,
    scope: "read",
    roles: [...STAFF],
    handler: (input, actor) => svc.listEntries(actor, input),
  }),
  defineTool({
    name: "time_add_entry",
    title: "Add time entry",
    description: `Log time that was already worked (a finished entry) for the caller. ${TIMES_HELP} An entry can't exceed 24 hours.`,
    input: entryInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.createEntry(actor, input),
  }),
  defineTool({
    name: "time_update_entry",
    title: "Update time entry",
    description: `Patch a time entry (also works on running timers). Send only what changes; "" clears description/project/task. ${TIMES_HELP} Changing the project re-snapshots its hourly rate.`,
    input: updateEntryInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.updateEntry(actor, input),
  }),
  defineTool({
    name: "time_delete_entry",
    title: "Delete time entry",
    description:
      "Permanently delete a time entry (or discard a running timer). Confirm with the user first.",
    input: entryIdInput,
    scope: "write",
    roles: [...STAFF],
    destructive: true,
    handler: ({ id }, actor) => {
      svc.deleteEntry(actor, id);
      return { deleted: id };
    },
  }),
  defineTool({
    name: "time_continue_entry",
    title: "Continue time entry",
    description:
      "Start a new running timer with the same description, project, task and billable flag as an existing entry.",
    input: entryIdInput,
    scope: "write",
    roles: [...STAFF],
    handler: ({ id }, actor) => svc.continueEntry(actor, id),
  }),
  defineTool({
    name: "time_report",
    title: "Time report",
    description:
      "Totals for a date range: from/to 'YYYY-MM-DD' (inclusive, app timezone). Returns totalHours, billableHours (decimal hours), " +
      "byDay (hours per day), byProject → tasks (hours) and, for admins, earnedMinorByCurrency (minor units, never mix currencies). " +
      "Optional projectId; owner/admin may pass userId (a user id or 'all', default: yourself).",
    input: reportInput,
    scope: "read",
    roles: [...STAFF],
    handler: (input, actor) => svc.timeReportForDays(actor, input),
  }),
];
