# Conventions

## TypeScript & files

- Strict TS. No `any` (use `unknown` + narrowing). Prefer inferred return types for services.
- File names: `kebab-case.tsx`. Components: `PascalCase`. Hooks: `useXxx`.
- Server-only modules start with `import "server-only";`. Client components start with
  `"use client";`. Never import `@/server/*` (except `actions.ts` and types) from client code.
- Path alias: `@/` → `src/`.
- Formatting: Prettier (`pnpm format`), Tailwind classes sorted by the prettier plugin.

## Naming

- Tables: plural snake_case (`time_entries`); columns snake_case; TS fields camelCase.
- IDs: 16-char random (`newId()`); tokens: `newToken()` (base64url, 256-bit).
- Services: verbs — `listX`, `getX`, `createX`, `updateX`, `deleteX`, `setXArchived`.
- Actions: `<verb><Thing>Action` (`createProjectAction`).
- Tools: `<module>_<verb>` snake_case (`time_start_timer`).
- i18n keys: camelCase; enum labels as `<field>_<value>` (`status_active`).

## Forms

```tsx
const form = useActionForm(createThingAction, { successMessage: t.common.saved, onSuccess: () => setOpen(false) });
<form action={form.submit}>
  <Field label={t.things.name} error={form.errors.name?.[0]}><Input name="name" /></Field>
  <SelectField name="status" options={…} />          {/* writes a hidden input */}
  <DatePicker name="dueDate" />                       {/* Jalali/Gregorian → "YYYY-MM-DD" */}
  <SwitchInput name="billable" defaultChecked />      {/* submits "true"/"false" */}
</form>
```

Use `zOptString`, `zNullString`, `zBool`, `zOptNumber`, `zTags`… from `src/lib/zod-helpers.ts` so
FormData strings parse correctly. `""` → `undefined` (create) or `null` (clear on update).

## Dates & time

- Store UTC instants (`integer` ms → `Date`). Day-precision values are stored as the start of
  that day **in the app timezone** (`fromDateInput(value, undefined, tz)`).
- Format with `formatDate / formatDateTime / formatTime / formatRelative(…, ctx.fmt)`.
- Week starts Saturday for `fa`, Monday for `en` (`weekStartFor(locale)`).
- Durations: milliseconds in code, `formatDuration` (h:mm[:ss]) or `formatHours` (decimal).

## Money

- `amountMinor: integer` + `currency: string` (`IRT` Toman has 0 decimals, `USD` 2…).
- UI input: major units → `toMinor(amount, currency)` / `parseMoneyInput("1,250", "USD")`.
- Display: `formatMoney(minor, currency, locale, { compact })`.
- Never sum different currencies together; group by currency.

## Errors

- Services throw `AppError(code, message, fieldErrors?)` (`notFound()`, `forbidden()` helpers).
- Actions/API translate them; never leak stack traces to the client.
- Pages: `getX(...).catch(e => e.code === "not_found" ? notFound() : throw)` pattern.

## Testing

- Unit tests with Vitest: `*.test.ts` next to the code (pure logic: tz, money, parsing,
  recurrence, permissions). `vi.mock("server-only", () => ({}))` when importing server modules.
- `pnpm build` is part of the check — it validates rendering rules.
- Browser end-to-end tests with Playwright: `e2e/*.spec.ts`, run with `pnpm test:e2e` against a
  running app with the demo data (`pnpm db:reset && pnpm db:seed && pnpm dev`; `BASE_URL` to
  target another host, `CHROMIUM_PATH` to use a local Chromium instead of `playwright install`).
  Use them for flows unit tests can't prove (e.g. `e2e/vault.spec.ts`: no plaintext ever leaves
  the browser). Clean up any data the test creates.

## Commits

Conventional Commits, imperative mood: `feat(calendar): add week view`, `fix(time): stop
running timers on logout`, `docs: …`, `chore: …`, `refactor: …`.
