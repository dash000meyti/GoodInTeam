# Module: Finance & Invoices

Money tracking for a multi-currency freelance studio (Toman, USD, USDT, EUR, AED…):
accounts, income/expense/transfer transactions, categories, counterparty and project
ledgers ("who owes whom"), manual FX rates, reports, and invoices with a public,
printable client link.

## Files

```
src/server/modules/finance/
  calc.ts            pure: balances, FX conversion, Jalali months, analytics, ledgers (tested)
  invoice-calc.ts    pure: line amounts, totals (discount + tax bps), numbering, status, time → lines (tested)
  csv.ts             pure: CSV parse/serialize, import mapping & validation (tested)
  schemas.ts         zod inputs (money in MAJOR units as strings; days "YYYY-MM-DD" or Jalali)
  internal.ts        shared server helpers (base currency, parseAmount, parseDay…)
  errors.ts          FinanceError(key, field) → localized via finance.err_<key>
  service.ts         accounts, categories, transactions, CSV import/export
  fx.ts              FX rates + convert(minor, from, to, at)
  reports.ts         overview, finance summary, project stats
  ledger.ts          counterparty / project ledgers, getProjectFinance
  invoices.ts        invoices lifecycle, payments, tracked time, overdue job, public view
  actions.ts         server actions (owner/admin) + public markInvoiceViewedAction
  tools.ts           MCP/REST tools (financeTools)
src/app/[locale]/panel/finance/            overview · transactions · accounts(/[id]) · categories · ledgers(/client|party|project/…) · rates
src/app/[locale]/panel/finance/_components/project-finance-panel.tsx   <ProjectFinancePanel/> for project pages
src/app/[locale]/panel/invoices/           list · new · [id] · [id]/edit
src/app/[locale]/i/[token]/                public invoice (noindex, A4 print)
src/app/api/finance/transactions/route.ts  CSV export (session auth, owner/admin)
src/components/finance/                    Money/MoneyStack/Approx, KpiCard, InvoiceDocument, status badge, print helpers
src/i18n/messages/{fa,en}/finance.ts
```

## Access

- **owner/admin**: everything (services call `assertAdmin`).
- **member**: no finance access.
- **client**: `/panel/invoices` lists invoices of their `clientId`, never drafts, and only
  when the invoice has no project or its project is in the portal with `shareFinance`
  (`invoiceAccessWhere`). Read-only detail + link to the public page. `getInvoice` /
  `listInvoices` (UI and API) strip internal fields for clients: bill-to only from the client
  record, no project hourly rate, payment account/memo, linked time-entry ids or author.
  `getProjectFinance(..., { clientView })` shows a client only their invoices and payments,
  and only when `projects.shareFinance` is on.
- **public**: `/i/<token>` (192-bit token created when an invoice is sent). Drafts are never
  public. Staff previews don't count as "viewed".

## Concepts

### Accounts

Where money lives (bank, cash, card, crypto, wallet, other) — **one currency each**.
`balance = openingBalance + Σ income − Σ expense − Σ transfers out + Σ transfers in`.
Pending transactions are included in `balance` and also reported as `pending`
(`cleared = balance − pending`). An account with transactions can't change currency or be
deleted (archive it instead).

### Transactions

`kind` = `income | expense | transfer`; `amountMinor` is always positive and in the
account's currency (the currency follows the account). Optional category (must match the
kind), project, counterparty (`clientId` for saved clients or a free-text `counterparty`),
tags, status `cleared | pending`.

**Transfers** move money between two accounts: `amountMinor` leaves the source account
(source currency) and `transferAmountMinor` arrives in the destination (destination
currency). Same currency → defaults to the same amount; different currencies → required
(the dialog suggests it from the latest FX rates).

UI input is in MAJOR units; `parseMoneyInput` accepts `1,250.50`, `۱٬۲۵۰٬۰۰۰`, Persian/Arabic
digits. A day typed as Jalali (`1405/07/22`) is accepted everywhere a day is expected.
A day without a time that is _today_ is stored as "now" (keeps same-day ordering natural).

### FX rates & "≈ base"

`fx_rates.rate` = how many units of the **base currency** (`settings.business.baseCurrency`)
one unit of `currency` is worth on `date` (one row per currency/base/day; saving the same
day replaces it). Rates are manual and only used for reporting — they never change stored
transactions.

`convert(minor, from, to, at)` uses the latest rate on/before `at` (else the earliest
after), converting through the base currency; it returns `null` when a rate is missing —
never a guess. UI totals in several currencies are shown per currency, plus an explicit
`≈` total in the base currency with a warning listing currencies that have no rate.

### Reports (overview)

- KPIs for the current month (Jalali month for `fa`): income, expenses, net — per currency
  plus `≈ base` and the trend vs last month.
- Cash flow per month for the last 6/12 months, expenses by category (top 5 + other), top
  clients by income. Data for 12 months is sent once as compact aggregated rows and switched
  client-side (range, currency, or "all ≈ base").
- Receivables (open invoices), account balances.
- Project profitability: income/expenses in the project currency (others converted `≈`),
  tracked hours, **effective rate = income ÷ tracked hours**, **budget used = (value of
  tracked time at the entry/project rate + expenses) ÷ budget**, outstanding invoices.

### Ledgers ("who owes whom")

Per counterparty (saved client or free-text name) and per currency, chronological lines
with a running balance:

- **debit (+)**: invoices issued to them (non-draft, non-void, at the issue date) and money
  we paid them (expense);
- **credit (−)**: money received from them (income).

`balance > 0` → they owe us (receivable, «طلب ما»); `< 0` → we owe them (prepayment/credit,
«بدهی ما»). Lending 1.5M to a person and getting 0.5M back shows "they owe 1M".
Project ledgers show income (+) and expenses (−) with a running **net cash** per currency,
plus the project's invoices.

### Invoices

Lifecycle: `draft → sent → viewed → partial → paid`, with `overdue` and `void`.
The status of a non-draft, non-void invoice is always **derived** (`deriveInvoiceStatus`):
paid ≥ total → `paid`; due day before today → `overdue`; some payment → `partial`;
viewed → `viewed`; else `sent`.

- **Totals**: `subtotal = Σ round(qty × unitPrice)`, discount clamped to the subtotal,
  `tax = round((subtotal − discount) × taxBps / 10 000)`, `total = subtotal − discount + tax`.
  Tax is entered as a percent and stored in basis points (900 = 9%).
- **Numbering**: `${business.invoicePrefix}${year}-${seq:3}` (e.g. `GT-1405-004`). The year is
  taken from the issue date in the app timezone using the **install's default locale
  calendar** (`fa` → Jalali). The sequence is max+1 per prefix/year; numbers are unique
  (unique index; a custom number can be typed in the editor).
- **From tracked time**: billable, finished, unbilled entries (`invoiceId` null) of the
  project are grouped by task (or description) and rate → lines with quantity = hours
  (2 decimals) and unit price = hourly rate (entry snapshot → project rate → business
  default). Lines keep `timeEntryIds`; saving the invoice sets `time_entries.invoiceId`
  (removing a line, deleting a draft or voiding releases them).
- **Send**: creates the share token and `sentAt`; returns the public link.
- **Payments**: `recordPayment` creates an `income` transaction (`invoiceId`, project, client)
  in an account **with the invoice currency**, adds to `paidMinor` and re-derives the status
  (`paidAt` = payment date when fully paid). Editing/deleting that transaction keeps the
  invoice in sync. Overpayment is rejected.
- **Void** keeps the number and payments; **delete** is for drafts only; **duplicate** makes a
  new draft dated today with the same due term.
- **Public page** `/i/<token>`: brand header (settings profile), bill-to, items, totals,
  payment instructions (`business.paymentInstructions[locale]`), PAID/VOID stamp, language
  switch, A4 print styles (only the document prints, always in light colors). The first
  client view sets `viewedAt` through a server action called after mount, and notifies every
  owner/admin (`invoice.viewed`, in each admin's language).

### Overdue job

`markOverdueInvoices(now)` (exported from `invoices.ts`) flips `sent | viewed | partial`
invoices whose due **day** is before today (app timezone) to `overdue`. It is idempotent,
called lazily when listing invoices, and runs hourly as the `invoice-overdue` background job
(`src/server/jobs/index.ts`).

### CSV

- **Export**: `GET /api/finance/transactions?<filters>&locale=fa` → UTF-8 CSV (BOM) with
  `date,time,date_jalali,kind,amount,currency,account,to_account,to_amount,to_currency,
category,project,client,counterparty,description,status,tags,invoice` (amounts in major
  units). Same filters as the transactions page.
- **Import** (Transactions → Import CSV): header row required, en or fa headers. Required
  `date, amount, account`; optional `kind` (income/expense or درآمد/هزینه; a negative amount
  without kind is an expense), `category`, `description`, `time`, `counterparty`, `status`.
  Delimiter `,` `;` or tab is auto-detected; Jalali dates and Persian digits work. A preview
  shows per-line errors/warnings; only valid rows are inserted (tagged `import`). Transfers
  are skipped; unknown categories import as uncategorized.

## Project page integration

```tsx
import { ProjectFinancePanel } from "@/app/[locale]/panel/finance/_components/project-finance-panel";

<ProjectFinancePanel projectId={project.id} ctx={ctx} clientView={actor.user.role === "client"} />;
```

Async server component; renders nothing when the viewer may not see project finance.

## Tools (MCP / REST)

Money returned by tools is in MINOR units with its currency; money **inputs** are MAJOR units.

| Tool                         | Scope              | What                                                                                                                |
| ---------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `finance_summary`            | read               | month (`2026-10` or Jalali `1405-07`) or day range: per-currency totals, by category, balances, receivables, ≈ base |
| `finance_list_accounts`      | read               | accounts with balances + categories                                                                                 |
| `finance_list_transactions`  | read               | filtered, paginated transactions + totals                                                                           |
| `finance_create_transaction` | write              | income/expense/transfer (MAJOR units)                                                                               |
| `finance_update_transaction` | write              | partial update                                                                                                      |
| `finance_delete_transaction` | write, destructive | delete (keeps linked invoice in sync)                                                                               |
| `finance_get_ledger`         | read               | `clientId`, `counterparty` or `projectId` ledger                                                                    |
| `finance_list_invoices`      | read               | invoices (clients see their own)                                                                                    |
| `finance_get_invoice`        | read               | invoice with items and payments                                                                                     |
| `finance_list_unbilled_time` | read               | unbilled time of a project grouped into lines                                                                       |
| `finance_create_invoice`     | write              | draft from `items` and/or `fromTime` (+ optional `send`)                                                            |
| `finance_send_invoice`       | write              | mark sent, returns public links (fa/en)                                                                             |
| `finance_record_payment`     | write              | payment → income transaction + status                                                                               |
| `finance_set_fx_rate`        | write              | rate of a currency vs base for a day                                                                                |

## Known limitations

- A payment must go to an account in the invoice's currency (no "received 1,000 USDT for a
  USD invoice" yet — would need an applied-amount column on transactions).
- Ledgers count only transactions linked to a client/counterparty; invoices marked paid
  without linked payment transactions (e.g. imported data) still show as debit.
- FX rates are manual (no provider sync).
