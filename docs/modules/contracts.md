# Module: Contracts, proposals & approvals (e-signature)

Send a contract, proposal, NDA, approval or change request to a client as a private link; the
client reads it, sees what they commit to, and signs (drawn/typed signature) or simply approves
("I approve"). Every step is pinned and logged.

## Files

```
src/server/modules/contracts/
  lifecycle.ts        pure state machine, version/hash rules, signing guard   (+ lifecycle.test.ts)
  placeholders.ts     {{placeholder}} engine, doc language detection          (+ placeholders.test.ts)
  integrity.ts        sha256 content hash, signature PNG validation
  starters.ts         built-in starter templates (fa + en)
  user-agent.ts       tiny UA summary for the audit trail
  schemas.ts          zod inputs (panel, API, public signing)
  service.ts          business logic + authorization (Actor first), public sign/view/decline
  actions.ts          panel server actions (owner/admin)
  public-actions.ts   unauthenticated actions for /sign/<token> (rate limited)
  tools.ts            MCP/REST tools
src/components/contracts/       signature-pad, contract-document, contract-sheet (A4), badges, print
src/app/[locale]/panel/contracts/
  page.tsx                       list (tabs, KPIs, filters, templates) · client portal list
  new/page.tsx, [id]/edit/page.tsx  editor
  [id]/page.tsx                  detail (document, signatures, timeline, actions)
  [id]/print/page.tsx            clean A4 print view
  _components/project-contracts-panel.tsx   <ProjectContractsPanel projectId ctx clientView />
src/app/[locale]/sign/[token]/   public signing page
src/i18n/messages/{fa,en}/contracts.ts
```

## Lifecycle (state machine)

```
draft ──send──► sent ──first view──► viewed ──sign/approve──► signed  (immutable)
  │              │  ▲                  │
  │              │  └── content edit ──┘   (new version, back to "sent")
  │              ├──decline──────────────► declined ──content edit──► sent (re-issued)
  │              ├──void─────────────────► void       (terminal)
  │              └──expiresAt passes─────► expired    ──edit (new deadline/content)──► sent
  └──delete (drafts & templates only)
```

| Status (effective) | Allowed actions                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------- |
| draft              | edit, send, delete, duplicate                                                                 |
| sent / viewed      | edit (re-issue), get link, remind, void, countersign, duplicate · public: view, sign, decline |
| signed             | countersign (owner), duplicate ("create a new version"), print                                |
| declined / expired | edit (re-issue), void, duplicate                                                              |
| void               | duplicate                                                                                     |
| template           | edit, delete, duplicate, use                                                                  |

- **expired is derived**: a sent/viewed contract whose `expiresAt` (end of the chosen day, app
  timezone) is in the past is shown/treated as `expired` everywhere (`effectiveStatus()`), without
  a write. A stored `expired` status is also honoured.
- The rules live in `lifecycle.ts` (`can`, `allowedActions`, `planEdit`, `checkSignable`) and are
  unit-tested; services enforce them (`ContractRuleError` → 409 for API, localized message in the
  panel).

## Integrity model (what the client saw is what they signed)

- On **send** the text is pinned: `contentHash = sha256(bodyMd)` (hex) and the current `version`.
- The signing page renders `bodyMd` and posts back the `contentHash` + `version` it displayed.
  The sign/decline action re-reads the row **inside a transaction** and refuses (`changed`) if
  either differs — the signer is asked to reload and read the new version.
- **Editing a sent document**: changing title, body or signature mode issues `version + 1`
  with a new hash and moves the status back to `sent` (same link; any pending view must be
  repeated; a declined document is re-opened). Metadata-only edits (deadline, signer, links)
  keep the version. Every post-send edit appends an `updated` event (`reissued`, versions, hash).
- **Signed and void documents are immutable**; to change a signed contract use
  _Create a new version_ (duplicates into a new draft with the same title).
- Each `contract_signatures` row stores `contentHash` + `version`, name, email, typed name, drawn
  PNG (validated: real PNG magic bytes, ≤ ~150 KB), IP, user agent and time. Signatures for an
  older version are shown as "previous version".
- The detail page re-computes `sha256(bodyMd)` and shows whether it still matches the stored hash.
- Bodies are normalized on save (CRLF → LF, trailing blanks trimmed) so the hash is stable.

## Templates & placeholders

Templates are `contracts` rows with `isTemplate = true` (never sent; placeholders kept). Built-in
**starters** (`starters.ts`: Persian software-development contract, Persian milestone acceptance,
English equivalents) are offered when no templates exist and created on demand (_Add starter
templates_ / `contracts_install_starters`) — they are not seeded.

Placeholders are `{{key}}` (dotted identifiers). Built-in keys, filled server-side on create/update
of a non-template document (and when applying a template in the editor):

| Key                                    | Value                                                       |
| -------------------------------------- | ----------------------------------------------------------- |
| `client.name/email/phone/address`      | selected client (or the project's client)                   |
| `project.name`                         | selected project                                            |
| `project.budget`                       | `formatMoney(budgetMinor, currency)` in the doc language    |
| `project.startDate`, `project.dueDate` | long date (Jalali + Persian digits for fa documents)        |
| `owner.name`                           | settings → profile `ownerName[lang]` (fallback: owner user) |
| `brand.name`                           | settings → profile `brandName[lang]`                        |
| `today`                                | today's long date                                           |

Any other key (e.g. `{{milestone.title}}`) can be supplied with `values` (API) or typed in.
Unknown or empty placeholders are **left visible**, highlighted in the document, counted in the
editor, and listed as a warning before sending. The document language (`fa`/`en`) is detected
from the text and drives date/money formatting, the document direction, the print view language
and the signing link (`/sign/…` vs `/en/sign/…`).

## Signing page (`/[locale]/sign/[token]`)

- 192-bit token (`newToken(24)`), `noindex`, `referrer: no-referrer`. Static shell + skeleton are
  prerendered; data streams in after `await connection()` inside `<Suspense>`.
- Unknown token or draft → not-found UI (streamed, so HTTP 200 like `/p/[token]`; noindex).
  Void / expired → friendly message only. Declined → notice + document. Signed → signed copy
  with signature blocks, audit summary and a print/PDF button.
- Pending: document (brand header, parties, version, fingerprint) + sticky signing panel on
  desktop, fixed bottom bar → bottom sheet on mobile. Fields: full name, optional email, drawn
  signature (`SignaturePad`: pointer events, coalesced points, velocity-weighted smooth strokes,
  DPR-aware, undo/clear, cropped PNG export) and/or typed signature, consent checkbox
  ("…version N…"). `requireSignature = false` → name + "I approve". Decline with optional reason.
- **Viewed** is recorded by a client component calling a server action on mount (never during
  render): first view of a sent version → status `viewed`, `firstViewedAt`, admin notification;
  a `viewed` event at most once per IP per hour.
- Staff sessions opening the link get a **preview** banner: views are not recorded and signing is
  disabled.
- After signing: one-time CSS confetti + success card (sessionStorage flag), then the signed copy.
- Rate limits (in-memory, per IP): sign/decline 10 per 10 min, view 60 per 10 min.

## Audit trail

`contract_events` is append-only: `created` (meta: template/starter/duplicatedFrom, via),
`updated` (version, reissued, fromVersion, hash), `sent` (version, hash), `viewed` (IP, UA),
`signed` (IP, UA, role client/owner, method drawn/typed/approval), `declined` (reason),
`voided` (reason, previous status), `reminded`. Owner/admin mutations are also written to
`activity_log`; public signatures as actor type `public`. Admins get in-app notifications
(`contract.viewed`, `contract.signed`, `contract.declined`) in their own language.

## Access

| Role        | Access                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------- |
| owner/admin | everything (create, edit, send, void, countersign, templates, tools)                              |
| client      | read-only list of their client's documents that were sent (no drafts/templates) → `/sign/<token>` |
| member      | none (commercial terms); the page shows a "managed by admins" state                               |
| public      | only the document behind a valid token                                                            |

`<ProjectContractsPanel projectId ctx clientView />` uses the same service scoping (renders
nothing for members); `clientView` hides drafts and links to the signing page.

## Tools (MCP / REST)

`contracts_list`, `contracts_get`, `contracts_list_templates`, `contracts_create`,
`contracts_update`, `contracts_send`, `contracts_remind`, `contracts_void`,
`contracts_duplicate`, `contracts_save_as_template`, `contracts_install_starters`,
`contracts_delete`. List tools never return bodies or signature images; `contracts_get` returns
signatures with `drawnSignature: { present }` instead of the image. Signing is deliberately not a
tool (a human must sign).

## Legal note

This is a **simple electronic signature with an audit trail** (identity claimed by the signer,
consent, time, IP, device and SHA-256 fingerprint of the exact text). It is **not** a qualified /
certificate-based (PKI) digital signature. The starter contracts include a clause in which the
parties agree that this form of signature and its records are valid proof between them.
