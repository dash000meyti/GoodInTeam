# Module: Projects & Clients (reference module)

This is the **reference implementation** — copy its structure for new modules.

## Files

```
src/server/modules/projects/{schemas,service,actions,tools}.ts
src/server/modules/clients/{schemas,service,actions,tools}.ts
src/app/[locale]/panel/projects/page.tsx            list (cards)
src/app/[locale]/panel/projects/[id]/page.tsx       detail (tabs, `?tab=<name>` deep link — see below)
src/app/[locale]/panel/projects/_components/*       client islands (form dialog, milestones, composer…)
src/app/[locale]/panel/clients/{page,[id]/page}.tsx
src/app/[locale]/p/[token]/page.tsx                 public status page (no auth, token-gated)
src/i18n/messages/{fa,en}/{projects,clients}.ts
```

## Detail page tabs

`overview · milestones · updates · tasks · time · calendar · contracts · finance · docs · portal`.
Each module tab renders that module's project panel (`<Module>Panel({ projectId, ctx, clientView })`
from `panel/<module>/_components/project-<module>-panel.tsx`), which does its own authorization
and returns `null` without access. Which tabs a viewer gets:

| Tab        | Staff (owner/admin/member) | Client (portal)                    |
| ---------- | -------------------------- | ---------------------------------- |
| milestones | ✓                          | `shareProgress`                    |
| tasks      | ✓                          | `shareTasks` (visible tasks only)  |
| time       | ✓ (money for admins)       | `shareTime` (no rates/user names)  |
| calendar   | ✓                          | ✓ (events `visibleToClient`)       |
| contracts  | owner/admin                | ✓ (sent documents of their client) |
| finance    | owner/admin                | `shareFinance` (their invoices)    |
| docs       | ✓                          | `shareDocs` (`client` pages)       |
| portal     | owner/admin                | —                                  |

`?tab=<name>` opens a tab directly (ignored when the viewer can't see it).

## Access

- owner/admin: full CRUD.
- member: projects listed in `project_members`; can post updates.
- client: projects of their client with `portal_enabled`; sees milestones/updates flagged
  `visible_to_client`; time stats only if `share_time`; finance only if `share_finance`.
- `projectAccessWhere(actor)` is the single SQL filter used everywhere (other modules should use
  it to scope project-linked data).

### Field visibility (`projectView`)

`listProjects` / `getProject` (and therefore pages, REST and MCP) run every row through
`projectView(actor, row)` so the redaction happens **server-side**, not just in the UI:

| Field                                            | owner/admin | member                         | client                    |
| ------------------------------------------------ | ----------- | ------------------------------ | ------------------------- |
| `budgetMinor`, `hourlyRateMinor`, `shareToken`   | ✓           | `null`                         | `null`                    |
| `members[].hourlyCostMinor`                      | ✓           | `null`                         | — (`members: []`)         |
| `client` (contact details, tax id, notes)        | full row    | `{ id, name, color, logoUrl }` | same as member            |
| `progress`, milestones                           | ✓           | ✓                              | only with `shareProgress` |
| `trackedMs` / `stats.trackedMs`, `estimateHours` | ✓           | ✓                              | only with `shareTime`     |
| `repoUrl`, `tags`                                | ✓           | ✓                              | `null` / `[]`             |
| `stats.money` (income/expense)                   | ✓           | `[]`                           | `[]`                      |

Hidden values are `null` (or empty), so UI code checks `progress != null` / `trackedMs != null`
instead of re-implementing the share flags.

The staff dashboard (`src/server/modules/dashboard/service.ts`) is scoped the same way: projects
via `projectAccessWhere`, tasks via `taskAccessWhere` (members: tasks of their projects + their
own/assigned personal tasks), events via `listCalendarItems` (access rules + recurring series
expanded to their next occurrences). Money, contracts and leads are admin-only.

## Update semantics

- Create and update have **separate schemas**. Never build an update schema with
  `createSchema.partial()`: in zod 4 `.partial()` still applies `.default()`s, so a partial update
  (e.g. a milestone status toggle) would silently reset `visibleToClient`, `status`, `currency`…
- Update schemas have no defaults; the service writes **only the keys present** in the input:
  - key absent / `undefined` → untouched;
  - `""` (form) or `null` (JSON) → cleared, for nullable fields (`startDate`, `dueDate`, `budget`,
    `hourlyRate`, `estimateHours`, `clientId`, `description`, URLs). Helpers: `zNullDay`,
    `zNullNumber[Of]`, `zNullString` from `src/lib/zod-helpers.ts`.
- Money inputs are major units parsed with the shared decimal parser (Persian digits and thousands
  separators OK; `0x10`, `1e3`, `Infinity` rejected) and converted with the new `currency`, or the
  project's current one. Changing only the currency keeps the major-unit amounts.
- Currencies must be one of `currencyCodes` (`zCurrency`). Dates must be real calendar days
  (`YYYY-MM-DD`, stored as the start of that day in the app timezone) or ISO date-times.
- The slug only changes when the name changes; a milestone update can't move it to another project.

## Due dates

A project due date is a calendar day: it is **overdue only after that day ends** in the app
timezone (`isOverdue` / `daysUntil` in `src/lib/due.ts`), never from 00:00 of the due day. The
detail page shows "N days left", "Due today" or "N days overdue". Tasks follow the same rule for
all-day due dates; timed task due dates are overdue once the time has passed.

## Progress

`progress_mode`:

- `manual` — the number you type.
- `milestones` — Σ weight(done) + ½ Σ weight(in_progress) / Σ weight.
- `tasks` — done / (all − canceled).
  Call `recalcProgress(projectId)` after changing milestones or task statuses.

## Tools

`projects_list`, `projects_get`, `projects_create`, `projects_update`, `projects_add_milestone`,
`projects_update_milestone`, `projects_post_update`, `clients_list`, `clients_get`,
`clients_create`, `clients_update`.
