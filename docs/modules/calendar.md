# Module: Calendar, commitments & ICS

"My calendar: what I promised to whom and when, which meetings I have, what scheduled work is
coming." One calendar for events, **commitments** (promises), and read-only overlays from other
modules, with a private ICS feed for Google / Apple / Outlook.

## Files

```
src/server/modules/calendar/
  schemas.ts      zod inputs (form + JSON)
  service.ts      access rules, range listing (all sources), CRUD, commitments, agenda, reminders
  feeds.ts        per-user ICS feed tokens (settings key `calendar.feeds`) + feed/event .ics building
  ics.ts          pure RFC 5545 serializer (escaping, 75-octet folding, RRULE adaptation) + tests
  actions.ts      server actions · tools.ts  MCP/REST tools
src/components/calendar/
  grid.ts         pure day-key math: Jalali/Gregorian months, week starts, view ranges + tests
  layout.ts       pure layout: lanes for day-spanning bars, side-by-side overlap columns + tests
  format.ts       deterministic labels (same output on server and client → no hydration diffs)
  kinds.ts        icons/colors per event kind and data source · types.ts  shared JSON types
src/app/[locale]/panel/calendar/
  page.tsx                    month · week · day · agenda (`?view=…&date=YYYY-MM-DD`)
  commitments/page.tsx        commitments dashboard
  _components/*               client islands (views, popover, event dialog, subscribe dialog…)
  _components/project-events-panel.tsx   server component for the project page / client portal
src/app/api/calendar/[token]/feed.ics/route.ts   private subscription feed
src/app/api/calendar/events/[id]/route.ts        single event download (.ics, signed-in staff)
src/i18n/messages/{fa,en}/calendar.ts
```

## Views

- **Month** — Jalali month with Saturday week start and Persian digits for `fa` (the Gregorian
  day number is shown small in each cell); Gregorian with Monday start for `en`. Multi-day /
  all-day items are bars packed into lanes; timed items show a dot + time. Up to 3 lanes per row,
  then "+N" (links to the day view). Weekends (Friday in `fa`, Sat/Sun in `en`) are tinted.
- **Week / Day** — 00–24 time grid (48 px/hour) with an all-day row, current-time line,
  overlapping events side by side (they stretch into free columns). Click an hour slot to
  create an event there (lower half = :30). Items ≥ 24 h go to the all-day row.
- **Agenda** — 30 days from the anchor date, grouped by day, with a Join button for meetings.
- Navigation: Today / prev / next, view switcher, mini month (xl screens) and a "Next 7 days"
  list. Keyboard: ← → move (RTL-aware), `T` today, `N` new event, `M/W/D/A` views (key codes,
  so they work with a Persian keyboard layout too).
- **Sources** (toggle chips, remembered in the `gt_cal_hidden` cookie so there's no flash):
  events, commitments, tasks (due dates → `/panel/tasks?task=<id>`), projects (project and
  milestone due dates → project page), invoices (due dates, admins only →
  `/panel/invoices/<id>`). Overlays are read-only; the tasks table is read directly (no
  dependency on the tasks module code).

Everything is computed in the **app timezone** (`appTimezone()`), never the browser's.

## Events

`events` rows (schema in `src/server/db/schema/work.ts`). Kinds: meeting, commitment, deadline,
focus, reminder, personal, other — each with an icon and default color (`kinds.ts`); an
explicit `color` overrides it.

- Timed: `startAt` instant, `endAt` instant or `null` (a point in time, e.g. "deliver by 17:00").
  In forms, `date` + `startTime`/`endTime`; an end before the start means "ends the next day".
- All-day: `startAt` = 00:00 of the first day; `endAt` = 00:00 of the **last day (inclusive)**
  or `null` for single-day events.
- Status: tentative · confirmed · done · missed · canceled.
- Create from the header button, by clicking an empty day/slot (pre-filled), or with `N`.
  Clicking an item opens a popover with details and actions (edit, duplicate, download .ics,
  delete with confirmation; quick kept/missed for commitments).

### Recurrence

RRULE via `src/lib/rrule.ts` (DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT, UNTIL, BYDAY,
BYMONTHDAY), expanded for the visible range. Presets + custom RRULE in the form.
**v1 limits:** editing, duplicating or deleting a recurring event always applies to the whole
series (no per-occurrence exceptions); monthly/yearly rules follow the Gregorian calendar (the
engine is Gregorian), so "every month on 1 Mehr" isn't expressible yet.

## Commitments

A commitment is an event with `kind = 'commitment'`: **what** (title), **to whom** (`clientId`;
members pick a project and its client is used), **when promised** (`promisedAt`, defaults to
now) and **due** (`startAt`, all-day or timed).

| UI / tools | stored `status` |
| ---------- | --------------- |
| pending    | `confirmed`     |
| kept       | `done`          |
| missed     | `missed`        |
| canceled   | `canceled`      |

Groups on `/panel/calendar/commitments`: **Overdue** (pending and the due moment passed — for
all-day commitments, the end of the due day), **Upcoming**, **Kept**, **Missed & canceled**.
Rows offer kept / missed / reschedule (keeps the time of day) / edit / cancel / delete.

Stats (respect the client/project filter): keeping rate = kept / (kept + missed), per-client
rates, overdue count, due in 7 days, average lead time (due − promisedAt).
A one-line quick form ("what + to whom + due") sits at the top.

## ICS feed

- Each staff user can create a private feed in **Calendar → Subscribe**:
  `https://<site>/api/calendar/<token>/feed.ics` (`?tasks=1` adds open task due dates as
  all-day events). Regenerating invalidates the old URL immediately.
- Storage: `settings` row `calendar.feeds` = `{ [userId]: { nonce, createdAt } }`. The token is
  `HMAC(APP_SECRET, userId:nonce)` (40 hex chars), so the DB alone never reveals a feed URL;
  rotating `APP_SECRET` invalidates all feeds.
- Contents: the user's visible events (access rules below) from 180 days ago on, plus every
  recurring series. Timed events use UTC (`DTSTART:…Z`), all-day events `VALUE=DATE` with an
  exclusive `DTEND`; commitments are prefixed 🤝, tasks ☑️; `VALARM` from
  `remindMinutesBefore`; canceled → `STATUS:CANCELLED`.
- RRULEs are passed through (normalized to the subset the app understands). Because DTSTART is
  UTC, `BYDAY`/`BYMONTHDAY` are shifted when the UTC date differs from the local date (e.g. a
  01:00 Tehran event is 21:30 UTC the day before). Zones with DST may drift by an hour across DST
  changes for recurring events (no VTIMEZONE by design).
- Single event download: `GET /api/calendar/events/<id>` (session cookie).

## Access

| Role         | Calendar                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| owner/admin  | everything; edit all events; invoice overlay                                                                     |
| member       | events they created + events of projects they're assigned to; task overlay: assigned/created/project tasks; may edit only events they created; can't link clients directly |
| client       | no calendar page; `ProjectEventsPanel` shows only `visibleToClient` events of their portal projects, without description/attendees/reminders |

`eventAccessWhere(actor)` in `service.ts` is the single SQL filter.

## Project page panel

```tsx
import { ProjectEventsPanel } from "@/app/[locale]/panel/calendar/_components/project-events-panel";
<ProjectEventsPanel projectId={project.id} ctx={ctx} clientView={isClient} />
```

Async server component: upcoming (next 120 days, recurring expanded) and recent events of the
project, with Join buttons. `clientView` is forced for client users.

## Reminders

`runEventReminders(now)` (service) sends an in-app notification to the event's creator when
`remindMinutesBefore` is reached (once per occurrence for recurring events, tracked by
`remindedAt`). Call it every minute from the jobs runner.

## Tools (MCP / REST)

| Tool                             | Scope                 | What                                                                 |
| -------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `calendar_list`                  | read                  | everything in a range (`from`/`to`, optional `sources`)              |
| `calendar_agenda`                | read                  | today / next N days, structured + ready-to-read `text`               |
| `calendar_get_event`             | read                  | one event (UTC + local wall-clock times)                             |
| `calendar_create_event`          | write                 | create (date/time fields or `startAt`/`endAt`, RRULE, attendees…)    |
| `calendar_update_event`          | write                 | partial update; moving the start keeps the duration                  |
| `calendar_delete_event`          | write (destructive)   | delete (whole series)                                                |
| `calendar_list_commitments`      | read                  | filter by status/client/project + keeping stats                      |
| `calendar_create_commitment`     | write                 | what + to whom + due (+ promisedAt)                                  |
| `calendar_set_commitment_status` | write                 | kept / missed / canceled / pending and/or reschedule with `due`      |
