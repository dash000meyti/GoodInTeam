import { messages } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { AppError } from "@/server/errors";

/** Business-rule errors of the finance module, localized via `finance.err_<key>`. */
export const financeErrorKeys = [
  "invalidAmount",
  "invalidTransferAmount",
  "invalidDate",
  "invalidRate",
  "rateForBase",
  "accountNotFound",
  "accountArchived",
  "accountHasTransactions",
  "currencyLocked",
  "transferAccountRequired",
  "transferSameAccount",
  "categoryKindMismatch",
  "linkedToInvoice",
  "invoiceNotEditable",
  "invoiceNumberTaken",
  "invoiceEmpty",
  "invoiceCurrencyMismatch",
  "invoiceNotPayable",
  "amountExceedsDue",
  "onlyDraftDelete",
  "timeAlreadyBilled",
  "noUnbilledTime",
  "importNothing",
] as const;
export type FinanceErrorKey = (typeof financeErrorKeys)[number];

type ErrKey = `err_${FinanceErrorKey}`;

export function financeMessage(key: FinanceErrorKey, locale: Locale) {
  return (messages[locale].finance as Record<ErrKey, string>)[`err_${key}`];
}

/**
 * Validation error with a stable key (and optional form field). English text
 * for API/MCP callers; server actions re-localize it with `localizeFinanceError`.
 */
export class FinanceError extends AppError {
  constructor(
    public key: FinanceErrorKey,
    public field?: string,
  ) {
    const msg = financeMessage(key, "en");
    super("validation", msg, field ? { [field]: [msg] } : undefined);
  }
}

export function localizeFinanceError(err: unknown, locale: Locale): unknown {
  if (!(err instanceof FinanceError)) return err;
  const msg = financeMessage(err.key, locale);
  return new AppError("validation", msg, err.field ? { [err.field]: [msg] } : undefined);
}
