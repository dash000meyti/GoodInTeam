import "server-only";
import { toDateInputValue, toTimeInputValue } from "@/lib/tz";
import type { Actor } from "@/server/auth/actor";
import { clientOptions } from "@/server/modules/clients/service";
import { minorToMajor } from "@/server/modules/finance/calc";
import { latestRates } from "@/server/modules/finance/fx";
import {
  accountOptions,
  categoryOptions,
  type TransactionRow,
} from "@/server/modules/finance/service";
import { projectOptions } from "@/server/modules/projects/service";

/** Pickers + FX data used by the transaction dialog (and other finance forms). */
export function txFormOptions(actor: Actor) {
  const { base, rates } = latestRates();
  return {
    accounts: accountOptions(actor),
    categories: categoryOptions(actor),
    projects: projectOptions(actor).map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      clientId: p.clientId,
    })),
    clients: clientOptions(actor),
    base,
    rates,
  };
}
export type TxFormOptions = ReturnType<typeof txFormOptions>;

export interface TxFormValues {
  id: string;
  kind: "income" | "expense" | "transfer";
  accountId: string;
  amount: string;
  date: string;
  time: string;
  categoryId: string | null;
  projectId: string | null;
  clientId: string | null;
  counterparty: string | null;
  description: string | null;
  status: "cleared" | "pending";
  tags: string;
  transferAccountId: string | null;
  transferAmount: string | null;
  invoiceNumber: string | null;
}

/** DB row → values for the edit dialog (major units, local date/time). */
export function toFormValues(row: TransactionRow, tz: string): TxFormValues {
  return {
    id: row.id,
    kind: row.kind,
    accountId: row.accountId,
    amount: String(minorToMajor(row.amountMinor, row.currency)),
    date: toDateInputValue(row.occurredAt, tz),
    time: toTimeInputValue(row.occurredAt, tz),
    categoryId: row.categoryId,
    projectId: row.projectId,
    clientId: row.clientId,
    counterparty: row.counterparty,
    description: row.description,
    status: row.status,
    tags: row.tags.join(", "),
    transferAccountId: row.transferAccountId,
    transferAmount:
      row.transferAmountMinor != null && row.toAccount
        ? String(minorToMajor(row.transferAmountMinor, row.toAccount.currency))
        : null,
    invoiceNumber: row.invoice?.number ?? null,
  };
}
