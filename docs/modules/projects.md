# Module: Projects & Clients (reference module)

This is the **reference implementation** — copy its structure for new modules.

## Files

```
src/server/modules/projects/{schemas,service,actions,tools}.ts
src/server/modules/clients/{schemas,service,actions,tools}.ts
src/app/[locale]/panel/projects/page.tsx            list (cards)
src/app/[locale]/panel/projects/[id]/page.tsx       detail (tabs: overview, milestones, updates, portal)
src/app/[locale]/panel/projects/_components/*       client islands (form dialog, milestones, composer…)
src/app/[locale]/panel/clients/{page,[id]/page}.tsx
src/app/[locale]/p/[token]/page.tsx                 public status page (no auth, token-gated)
src/i18n/messages/{fa,en}/{projects,clients}.ts
```

## Access

- owner/admin: full CRUD.
- member: projects listed in `project_members`; can post updates.
- client: projects of their client with `portal_enabled`; sees milestones/updates flagged
  `visible_to_client`; time stats only if `share_time`; finance only if `share_finance`.
- `projectAccessWhere(actor)` is the single SQL filter used everywhere (other modules should use
  it to scope project-linked data).

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
