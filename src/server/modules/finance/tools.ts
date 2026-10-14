import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import { AppError } from "@/server/errors";
import { localePath, locales } from "@/i18n/config";
import { env } from "@/lib/env";
import { zId, zOptString } from "@/lib/zod-helpers";
import { minorToMajor } from "./calc";
import * as fx from "./fx";
import * as inv from "./invoices";
import * as ledger from "./ledger";
import * as reports from "./reports";
import {
  fxRateInput,
  invoiceInput,
  ledgerInput,
  listInvoicesInput,
  listTransactionsInput,
  recordPaymentInput,
  summaryInput,
  transactionInput,
  unbilledTimeInput,
  updateTransactionInput,
} from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

const MONEY_NOTE =
  "Returned amounts are integer MINOR units (`*Minor`) with their `currency` (IRT/IRR have 0 decimals; USD, USDT, EUR, AED… have 2). Never add different currencies together.";

function publicLinks(token: string) {
  return Object.fromEntries(locales.map((l) => [l, `${env.siteUrl}${localePath(l, `/i/${token}`)}`]));
}

const createInvoiceToolInput = invoiceInput.extend({
  /**
   * Add the project's unbilled billable time as lines (grouped by task/description,
   * quantity = hours, unit price = hourly rate). Requires projectId.
   */
  fromTime: z
    .object({ from: zOptString(20), to: zOptString(20) })
    .optional()
    .describe("Bill tracked time: inclusive day range 'YYYY-MM-DD' (omit both for all unbilled time)"),
});

export const financeTools = [
  defineTool({
    name: "finance_summary",
    title: "Finance summary",
    description: `Income, expenses and net per currency for a month or a day range, totals by category, every account balance, and unpaid invoices (receivables). Pass month as 'YYYY-MM' (Gregorian) or Jalali like '1405-07'; or from/to 'YYYY-MM-DD'. Defaults to the current (Jalali) month. approxInBase converts with the latest manual FX rates. ${MONEY_NOTE}`,
    input: summaryInput,
    scope: "read",
    roles: [...ADMIN],
    handler: (input, actor) => reports.financeSummary(actor, input),
  }),
  defineTool({
    name: "finance_list_accounts",
    title: "List money accounts",
    description: `Accounts (bank, cash, card, crypto wallet…) with currency, live balance (opening + incomes − expenses ± transfers), pending amount, and transaction count. Also returns income/expense categories (ids for finance_create_transaction). ${MONEY_NOTE}`,
    input: z.object({ includeArchived: z.boolean().optional() }),
    scope: "read",
    roles: [...ADMIN],
    handler: (input, actor) => ({
      accounts: svc.listAccounts(actor, input),
      categories: svc.categoryOptions(actor),
    }),
  }),
  defineTool({
    name: "finance_list_transactions",
    title: "List transactions",
    description: `Transactions newest first, filtered by accountId, kind (income|expense|transfer), categoryId ('none' = uncategorized), projectId, clientId, invoiceId, status, from/to days 'YYYY-MM-DD' (inclusive, app timezone) and free-text q. Paginated (page, pageSize ≤ 500). Includes per-currency totals of the whole filter. ${MONEY_NOTE}`,
    input: listTransactionsInput,
    scope: "read",
    roles: [...ADMIN],
    handler: (input, actor) => svc.listTransactions(actor, input),
  }),
  defineTool({
    name: "finance_create_transaction",
    title: "Record a transaction",
    description:
      "Record income, an expense, or a transfer between two accounts. `amount` is in MAJOR units of the account's currency (e.g. '1250000' Toman or '12.50' USD; Persian digits OK) and always positive — `kind` gives the direction. The currency always follows the account. For transfers set transferAccountId and, when the two accounts use different currencies, transferAmount (MAJOR units received). Use clientId for saved counterparties or counterparty for a free-text name. date 'YYYY-MM-DD' + optional time 'HH:mm' (app timezone), default now.",
    input: transactionInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.createTransaction(actor, input),
  }),
  defineTool({
    name: "finance_update_transaction",
    title: "Update a transaction",
    description:
      "Partially update a transaction by id. Money fields (amount, transferAmount) are MAJOR units of the account currency. Editing an invoice payment keeps the invoice's paid amount and status in sync.",
    input: updateTransactionInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.updateTransaction(actor, input),
  }),
  defineTool({
    name: "finance_delete_transaction",
    title: "Delete a transaction",
    description:
      "Permanently delete a transaction. If it was an invoice payment, the invoice's paid amount and status are reduced accordingly. Confirm with the user first.",
    input: z.object({ id: zId }),
    scope: "write",
    destructive: true,
    roles: [...ADMIN],
    handler: ({ id }, actor) => {
      svc.deleteTransaction(actor, id);
      return { deleted: id };
    },
  }),
  defineTool({
    name: "finance_get_ledger",
    title: "Counterparty or project ledger",
    description: `Ledger with running balance per currency. Pass clientId (saved client/person/company), counterparty (free-text name) or projectId. For counterparties: debit = invoices issued to them + money we paid them, credit = money received from them; balance > 0 means they owe us, < 0 means we owe them (prepayment/payable). For projects the balance is net cash (income − expenses) and invoices are listed. ${MONEY_NOTE}`,
    input: ledgerInput,
    scope: "read",
    roles: [...ADMIN],
    handler: (input, actor) =>
      input.projectId
        ? ledger.getProjectLedger(actor, input.projectId)
        : input.clientId
          ? ledger.getClientLedger(actor, input.clientId)
          : ledger.getPartyLedger(actor, input.counterparty!),
  }),
  defineTool({
    name: "finance_list_invoices",
    title: "List invoices",
    description: `Invoices with client, project, totals and amount still due (dueMinor). Filter by status (draft|sent|viewed|partial|overdue|paid|void, or 'open' = unpaid), clientId, projectId or q (number/client). Overdue statuses are refreshed first. Client users only see their own non-draft invoices. ${MONEY_NOTE}`,
    input: listInvoicesInput,
    scope: "read",
    handler: (input, actor) => inv.listInvoices(actor, input),
  }),
  defineTool({
    name: "finance_get_invoice",
    title: "Get invoice",
    description: `One invoice with line items, client, project and recorded payments. ${MONEY_NOTE}`,
    input: z.object({ id: zId }),
    scope: "read",
    handler: ({ id }, actor) => inv.getInvoice(actor, id),
  }),
  defineTool({
    name: "finance_list_unbilled_time",
    title: "Unbilled time of a project",
    description:
      "Billable, finished, not-yet-invoiced time entries of a project grouped into would-be invoice lines (hours × hourly rate in MINOR units). Optional from/to days 'YYYY-MM-DD'.",
    input: unbilledTimeInput,
    scope: "read",
    roles: [...ADMIN],
    handler: (input, actor) => inv.unbilledTime(actor, input),
  }),
  defineTool({
    name: "finance_create_invoice",
    title: "Create invoice",
    description:
      "Create a DRAFT invoice (number auto-assigned as `<prefix><year>-NNN`, year in the Jalali calendar). Provide `items` (description, quantity, unitPrice in MAJOR units of `currency`) and/or `fromTime` with a projectId to bill the project's unbilled tracked time (those time entries get linked to the invoice). discount is MAJOR units; taxPercent e.g. 9 (defaults to the business default tax). Dates 'YYYY-MM-DD'. Set send=true to also mark it sent and get the public link.",
    input: createInvoiceToolInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => {
      const { fromTime, ...rest } = input;
      let items = rest.items;
      if (fromTime) {
        if (!rest.projectId) {
          throw new AppError("validation", "fromTime requires projectId", {
            projectId: ["Required when fromTime is set"],
          });
        }
        const { groups } = inv.unbilledTime(actor, { projectId: rest.projectId, ...fromTime });
        items = [
          ...items,
          ...groups
            .filter((g) => g.currency === rest.currency)
            .map((g) => ({
              description: g.label,
              quantity: g.hours,
              unitPrice: String(minorToMajor(g.rateMinor, g.currency)),
              timeEntryIds: g.entryIds,
            })),
        ];
      }
      const row = inv.createInvoice(actor, { ...rest, items });
      return { invoice: row, publicLinks: row.shareToken ? publicLinks(row.shareToken) : null };
    },
  }),
  defineTool({
    name: "finance_send_invoice",
    title: "Send invoice (get public link)",
    description:
      "Mark an invoice as sent and return its public, unguessable link (fa and en). The client's first visit marks it 'viewed' and notifies admins. Does not email anything — share the link yourself.",
    input: z.object({ id: zId }),
    scope: "write",
    roles: [...ADMIN],
    handler: ({ id }, actor) => {
      const res = inv.sendInvoice(actor, id);
      return { invoice: res.invoice, publicLinks: publicLinks(res.token) };
    },
  }),
  defineTool({
    name: "finance_record_payment",
    title: "Record invoice payment",
    description:
      "Record a payment against an invoice: creates an income transaction in `accountId` (must use the invoice currency) and updates the invoice to partial/paid. `amount` is MAJOR units of the invoice currency and cannot exceed the amount due.",
    input: recordPaymentInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => inv.recordPayment(actor, input),
  }),
  defineTool({
    name: "finance_set_fx_rate",
    title: "Set FX rate",
    description:
      "Set the exchange rate of a currency against the base currency for a day (default today): `rate` = how many units of the base currency (e.g. Toman) ONE unit of `currency` is worth, e.g. currency 'USD', rate '105000'. Replaces an existing rate for the same day. Used for '≈ base' totals.",
    input: fxRateInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => fx.setFxRate(actor, input),
  }),
];
