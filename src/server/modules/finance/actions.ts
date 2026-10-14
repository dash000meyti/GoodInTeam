"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction, definePublicAction, requestLocale } from "@/server/action";
import { getActor } from "@/server/auth/session";
import { isStaff } from "@/server/auth/actor";
import { localePath } from "@/i18n/config";
import { env } from "@/lib/env";
import { zId } from "@/lib/zod-helpers";
import { localizeFinanceError } from "./errors";
import * as fx from "./fx";
import * as inv from "./invoices";
import {
  accountInput,
  categoryInput,
  fxRateInput,
  importCsvInput,
  invoiceInput,
  recordPaymentInput,
  tokenInput,
  transactionInput,
  unbilledTimeInput,
  updateAccountInput,
  updateCategoryInput,
  updateFxRateInput,
  updateInvoiceInput,
  updateTransactionInput,
} from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;
const roles = [...ADMIN];
const idInput = z.object({ id: zId });

/** Run a service call; re-localize finance business errors for the UI. */
async function run<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw localizeFinanceError(err, await requestLocale());
  }
}

// ─── Accounts ───────────────────────────────────────────────────────────────

export const createAccountAction = defineAction({ input: accountInput, roles }, (input, actor) =>
  run(() => {
    const row = svc.createAccount(actor, input);
    refresh();
    return { id: row.id };
  }),
);

export const updateAccountAction = defineAction({ input: updateAccountInput, roles }, (input, actor) =>
  run(() => {
    svc.updateAccount(actor, input);
    refresh();
    return { id: input.id };
  }),
);

export const archiveAccountAction = defineAction(
  { input: z.object({ id: zId, archived: z.boolean() }), roles },
  ({ id, archived }, actor) =>
    run(() => {
      svc.setAccountArchived(actor, id, archived);
      refresh();
      return null;
    }),
);

export const deleteAccountAction = defineAction({ input: idInput, roles }, ({ id }, actor) =>
  run(() => {
    svc.deleteAccount(actor, id);
    refresh();
    return null;
  }),
);

// ─── Categories ─────────────────────────────────────────────────────────────

export const createCategoryAction = defineAction({ input: categoryInput, roles }, (input, actor) =>
  run(() => {
    const row = svc.createCategory(actor, input);
    refresh();
    return { id: row.id };
  }),
);

export const updateCategoryAction = defineAction(
  { input: updateCategoryInput, roles },
  (input, actor) =>
    run(() => {
      svc.updateCategory(actor, input);
      refresh();
      return { id: input.id };
    }),
);

export const deleteCategoryAction = defineAction({ input: idInput, roles }, ({ id }, actor) =>
  run(() => {
    svc.deleteCategory(actor, id);
    refresh();
    return null;
  }),
);

// ─── Transactions ───────────────────────────────────────────────────────────

export const createTransactionAction = defineAction(
  { input: transactionInput, roles },
  (input, actor) =>
    run(() => {
      const row = svc.createTransaction(actor, input);
      refresh();
      return { id: row.id };
    }),
);

export const updateTransactionAction = defineAction(
  { input: updateTransactionInput, roles },
  (input, actor) =>
    run(() => {
      svc.updateTransaction(actor, input);
      refresh();
      return { id: input.id };
    }),
);

export const deleteTransactionAction = defineAction({ input: idInput, roles }, ({ id }, actor) =>
  run(() => {
    svc.deleteTransaction(actor, id);
    refresh();
    return null;
  }),
);

export const previewImportAction = defineAction(
  { input: importCsvInput, roles, write: false },
  ({ csv }, actor) => run(() => svc.previewImport(actor, csv)),
);

export const importTransactionsAction = defineAction(
  { input: importCsvInput, roles },
  ({ csv }, actor) =>
    run(() => {
      const res = svc.importTransactions(actor, csv);
      refresh();
      return res;
    }),
);

// ─── FX rates ───────────────────────────────────────────────────────────────

export const setFxRateAction = defineAction({ input: fxRateInput, roles }, (input, actor) =>
  run(() => {
    const row = fx.setFxRate(actor, input);
    refresh();
    return { id: row.id };
  }),
);

export const updateFxRateAction = defineAction({ input: updateFxRateInput, roles }, (input, actor) =>
  run(() => {
    fx.updateFxRate(actor, input);
    refresh();
    return { id: input.id };
  }),
);

export const deleteFxRateAction = defineAction({ input: idInput, roles }, ({ id }, actor) =>
  run(() => {
    fx.deleteFxRate(actor, id);
    refresh();
    return null;
  }),
);

// ─── Invoices ───────────────────────────────────────────────────────────────

async function publicUrl(token: string) {
  return `${env.siteUrl}${localePath(await requestLocale(), `/i/${token}`)}`;
}

export const createInvoiceAction = defineAction({ input: invoiceInput, roles }, (input, actor) =>
  run(async () => {
    const row = inv.createInvoice(actor, input);
    refresh();
    return { id: row.id, url: row.shareToken ? await publicUrl(row.shareToken) : null };
  }),
);

export const updateInvoiceAction = defineAction(
  { input: updateInvoiceInput, roles },
  (input, actor) =>
    run(async () => {
      const row = inv.updateInvoice(actor, input);
      refresh();
      return { id: row.id, url: row.shareToken ? await publicUrl(row.shareToken) : null };
    }),
);

export const sendInvoiceAction = defineAction({ input: idInput, roles }, ({ id }, actor) =>
  run(async () => {
    const res = inv.sendInvoice(actor, id);
    refresh();
    return { token: res.token, url: await publicUrl(res.token) };
  }),
);

export const recordPaymentAction = defineAction(
  { input: recordPaymentInput, roles },
  (input, actor) =>
    run(() => {
      const res = inv.recordPayment(actor, input);
      refresh();
      return { status: res.invoice.status };
    }),
);

export const voidInvoiceAction = defineAction({ input: idInput, roles }, ({ id }, actor) =>
  run(() => {
    inv.voidInvoice(actor, id);
    refresh();
    return null;
  }),
);

export const duplicateInvoiceAction = defineAction({ input: idInput, roles }, ({ id }, actor) =>
  run(() => {
    const row = inv.duplicateInvoice(actor, id);
    refresh();
    return { id: row.id };
  }),
);

export const deleteInvoiceAction = defineAction({ input: idInput, roles }, ({ id }, actor) =>
  run(() => {
    inv.deleteInvoice(actor, id);
    return null;
  }),
);

export const unbilledTimeAction = defineAction(
  { input: unbilledTimeInput, roles, write: false },
  (input, actor) =>
    run(async () => {
      const locale = await requestLocale();
      return inv.unbilledTime(actor, input, locale);
    }),
);

/**
 * Called once by the public invoice page after it mounts (never during render).
 * Staff previews don't count as a view.
 */
export const markInvoiceViewedAction = definePublicAction(tokenInput, async ({ token }) => {
  const actor = await getActor();
  if (actor && isStaff(actor)) return { counted: false };
  return { counted: inv.markInvoiceViewed(token) };
});
