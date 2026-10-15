# Module: Time tracking · Tasks & reminders · Notifications · Jobs

The owner's day-to-day engine: every minute tracked (several timers can run at
once), a trusted task list with reminders, in-app notifications and the
background jobs that fire reminders.

## Files

```
src/server/modules/time/{schemas,service,actions,tools}.ts
src/server/modules/time/calc.ts            pure math: clipping, per-day split, earnings, report aggregation, entry-time parsing (tested)
src/server/modules/time/ranges.ts          report range presets (Jalali months for fa, tested)
src/server/modules/tasks/{schemas,service,actions,tools}.ts
src/server/modules/tasks/access.ts         taskAccessWhere() / accessibleTask()
src/server/modules/tasks/recurrence.ts     next occurrence of a completed recurring task (tested)
src/server/modules/notifications/{service,schemas,actions,tools,header}.ts
src/server/jobs/{scheduler,reminders,index}.ts
src/lib/duration.ts                        "1:30" / "90m" / "۱ ساعت و ۲۰ دقیقه" ⇄ ms (tested)
src/lib/quick-add.ts                       quick-add parser shared by client + server (tested)
src/lib/day-label.ts                       natural day labels ("پنجشنبه ۲۳ مهر")
src/app/[locale]/panel/time/page.tsx                 timer bar, running timers, KPIs, timeline
src/app/[locale]/panel/time/timesheet/page.tsx       project × 7 days grid
src/app/[locale]/panel/time/reports/page.tsx         KPIs, charts, breakdown, CSV
src/app/[locale]/panel/time/_components/project-time-panel.tsx   <ProjectTimePanel/> for the project page
src/app/[locale]/panel/tasks/page.tsx                smart lists + board (one client island)
src/app/[locale]/panel/tasks/_components/project-tasks-panel.tsx <ProjectTasksPanel/> for the project page
src/app/api/time/export/route.ts                     CSV download (session auth)
src/components/time/{timer-pill,project-select,pulse-dot}.tsx
src/components/notifications/{header-live,notifications-bell}.tsx
src/i18n/messages/{fa,en}/{time,tasks,notifications}.ts
```

## Time tracking (`/panel/time`)

- **Parallel timers:** a running timer is a `time_entries` row with `ended_at = null`; starting
  one never stops another. "Stop all" stops every running timer of the caller.
- **Rate snapshot:** on start/create the project's `hourlyRateMinor` + `currency` are copied
  onto the entry (re-snapshotted when the project of an un-invoiced entry changes), so later
  rate changes don't rewrite history. `billable` defaults to true unless the project is
  `internal`.
- **Start bar:** description, project, task (filtered by project), billable toggle, Enter
  starts. **Running cards:** live duration, inline description/project edit, billable toggle,
  stop, edit, discard. Timers running > 10 h are flagged ("forgot to stop?") and a background
  job sends a one-time notification linking to `/panel/time?entry=<id>` (opens the editor).
- **Timeline:** current week (Saturday-start for fa, Monday for en), grouped by day with day
  totals; "show previous week" adds `?weeks=N`. Row actions: edit, continue (new timer with the
  same fields), duplicate (copy placed right after the original), delete.
- **Manual entry / edit dialog:** date (Jalali picker for fa) + start/end times or date +
  duration. Accepted combinations (also for the API), resolved by `resolveEntryTimes`:
  1. `startedAt` + `endedAt` (ISO) or `startedAt` + `duration`;
  2. `date` + `startTime` + `endTime` — an end time ≤ start time means it ended after
     midnight;
  3. `date` + `startTime` + `duration`;
  4. `date` + `duration` — today: ends now; past days: right after that day's last finished
     entry (else 09:00).

  Validation: end > start, max 24 h per entry. Durations accept `1:30`, `90m`, `1.5h`, `1.5`
  (hours), `۱ ساعت و ۲۰ دقیقه`. Durations are always computed on the server.

- **Timesheet** (`/panel/time/timesheet?week=YYYY-MM-DD`): project × 7 days, row/day totals,
  previous/next week; clicking a cell opens "add time" prefilled with that day + project.
- **Reports** (`/panel/time/reports?range=this_week|last_week|this_month|last_month|last_30|custom&from&to&project&user`):
  KPIs (total, billable %, earned per currency — admins, daily average over active days),
  stacked hours-per-day chart by project (per week when the range is > 62 days), project donut,
  project → task breakdown table and **CSV export** (`GET /api/time/export?from=&to=&user=&project=`,
  UTF-8 with BOM, Gregorian + Jalali date columns).
- Entries spanning midnight are split per day in timesheet/reports and clipped to the range.

## Tasks & reminders (`/panel/tasks`)

- **Smart lists** (computed client-side from one server payload, so switching is instant):
  Inbox (`status = inbox`), Today (inbox/todo/in_progress/waiting due ≤ today, overdue first
  and highlighted), Upcoming (next 14 days grouped by day), Anytime (todo/in_progress without a
  date), Waiting, Someday, Done (latest 50). Filters: project (incl. "personal"), priority, tag,
  search. State lives in the URL (`?list=&view=board&project=&priority=&tag=&q=&task=`) via
  `history.replaceState`. Lists show top-level tasks; subtasks live in the detail sheet.
- **Board** (`?view=board`): columns todo / in_progress / waiting / done (completed in the last
  14 days). Native HTML5 drag & drop with a drop indicator; every card also has a "Move to"
  menu (keyboard / touch). Dropping sets `sort` to the midpoint of its neighbours.
- **Task row:** round checkbox (priority-tinted) with a pop animation; completion is delayed a
  beat for the animation and the toast offers **Undo** (which also deletes the auto-created next
  occurrence of a recurring task).
- **Detail sheet** (`?task=<id>`): title, status, priority, project, assignee (when the team has
  more than one person), due date + optional time (`dueAllDay`), reminder date + time
  (`remindAt`; changing it re-arms the reminder), estimate (minutes), recurrence presets from
  `rrulePresets` or a custom RRULE, tags, "show in client portal", Markdown notes, subtasks
  checklist, "Start timer" (running entry linked to the task; inbox/todo → in_progress), delete.
- **Recurring tasks:** completing marks the task done and creates the next occurrence with the
  same fields (subtasks copied as open). The next date is the first occurrence after
  max(current due, end of today): an overdue weekly task jumps to the upcoming week; completing
  early skips the current one. `remindAt` shifts by the same amount. (RRULE `COUNT` restarts with
  each occurrence; use `UNTIL` to end a series.)
- **Project progress:** status changes call `recalcProgress(projectId)` when the project's
  `progressMode` is `tasks`.
- **Default status on create:** `todo` when the task has a project, a due date or a parent,
  otherwise `inbox`. Adding from a smart list applies sensible defaults (Today → due today,
  Waiting → waiting, Someday → someday, a project filter → that project).

### Quick-add syntax

Type naturally; recognised tokens are removed from the title and shown as preview chips.

| Token                                                                      | Meaning                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| `!1` … `!4` (Persian digits too)                                           | priority: 1 low · 2 medium · 3 high · 4 urgent         |
| `#tag`                                                                     | tag (repeatable; Persian letters fine: `#شخصی`)        |
| `+project-slug`                                                            | project by slug (exact → prefix → name contains)       |
| `today` `tod` `امروز` · `tomorrow` `tmr` `فردا` · `پس‌فردا` `پس فردا`      | due date                                               |
| weekday names: `sat`…`friday`, `شنبه` … `جمعه` (`سه شنبه` with a space ok) | the next such day, strictly after today                |
| `14:30`, `at 9:15`, `ساعت ۱۰:۳۰`                                           | due time (date defaults to today); without it, all-day |

Example: `تمدید دامنه فردا ساعت ۱۰:۳۰ #شخصی +good-team-site !3`. An unknown `+project` stays in
the title (and the preview warns). Press **n** anywhere on the page to focus the quick-add box.

## Notifications

`notify(userId, { kind, title, body?, href? })` (in `notifications/service.ts`) creates an
in-app notification; `href` is panel-relative (`/panel/...`, the UI adds the locale prefix).
Kinds used here: `task.reminder`, `event.reminder`, `time.long_running`.

The top-bar **bell** shows the unread count, the latest 15 items (click = mark read + open),
"mark all as read" and an opt-in for **desktop notifications**. The header polls
`pollHeaderAction` every 60 s (and when the tab becomes visible); new unread items pop as a toast
(tab visible) or a native notification (tab hidden, permission granted). The **timer pill**
(staff only) shows a pulsing dot, the count and the live elapsed time of the latest timer; its
popover lists running timers with stop buttons and a quick-start form.

## Background jobs (`src/server/jobs`)

A tiny in-process scheduler started once from `src/instrumentation.ts` (`register()`, Node
runtime only, never during `next build`; state on `globalThis` so dev reloads don't
double-start; timers are `unref`'d; each run is error-isolated and never overlaps itself).
Set `JOBS_DISABLED=1` to turn jobs off.

| Job                   | Every  | What                                                                                                                                                                   |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task-reminders`      | 1 min  | open tasks with `remind_at ≤ now` and `reminded_at` null → notify `assignee ?? created_by` (href `/panel/tasks?task=<id>`), set `reminded_at`                          |
| `event-reminders`     | 1 min  | `runEventReminders()` from the calendar service — one-off **and recurring** events (once per occurrence, tracked by `remindedAt`) → notify creator, link `?event=<id>` |
| `long-running-timers` | 15 min | running timers older than 10 h → one notification per entry                                                                                                            |
| `invoice-overdue`     | 1 h    | `markOverdueInvoices()` — sent/viewed/partial invoices past their due day become `overdue` (see `docs/modules/finance.md`)                                             |

Notification texts use the recipient's locale (`users.locale`).

**Adding a job** from another module:

```ts
// src/server/jobs/index.ts → startJobs()
registerJob("invoice-overdue", 60 * 60_000, () => markOverdueInvoices());
```

`registerJob(name, everyMs, fn)` may also be called at runtime (late registrations are scheduled
immediately; re-registering a name replaces it). Jobs must be idempotent and quick; use
`runJob(name)` to trigger one manually and `listJobs()` for diagnostics.

## Access rules

| Role        | Time                                                                                     | Tasks                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| owner/admin | own time by default; `user=<id>` / `all` filter; may edit any entry; sees rates/earnings | all project tasks + personal tasks (no project) they created or are assigned to                             |
| member      | only their own entries; only projects they are assigned to; no rates/earnings            | tasks of assigned projects + personal tasks they created or are assigned to                                 |
| client      | no access to `/panel/time`; `ProjectTimePanel clientView` only if `share_time`           | no access to `/panel/tasks`; `ProjectTasksPanel clientView` only `visible_to_client` tasks if `share_tasks` |

Personal tasks are private to their creator/assignee — even for admins.

## Components for the project page

```tsx
import { ProjectTimePanel } from "@/app/[locale]/panel/time/_components/project-time-panel";
import { ProjectTasksPanel } from "@/app/[locale]/panel/tasks/_components/project-tasks-panel";

<ProjectTimePanel projectId={project.id} ctx={ctx} clientView={isClient} />
<ProjectTasksPanel projectId={project.id} ctx={ctx} clientView={isClient} />
```

Both are async server components; they render `null` when the viewer may not see the data
(e.g. a client and the project doesn't share time/tasks). `clientView` hides rates, earnings,
user names and makes tasks read-only.

## Tools (MCP / REST)

Time: `time_start_timer`, `time_stop_timer` (id or `"all"`), `time_list_running`,
`time_list_entries`, `time_add_entry`, `time_update_entry`, `time_delete_entry`,
`time_continue_entry`, `time_report`.
Tasks: `tasks_list`, `tasks_get`, `tasks_counts`, `tasks_create` (supports quick-add `text`),
`tasks_update`, `tasks_complete`, `tasks_reopen`, `tasks_move`, `tasks_add_subtask`,
`tasks_start_timer`, `tasks_delete`.
Notifications: `notifications_list`, `notifications_mark_read`.

Units: durations in **milliseconds** (`durationMs`, `trackedMs`), reports in decimal **hours**,
money in **minor units** per currency; days are `YYYY-MM-DD` in the app timezone, instants ISO 8601.
