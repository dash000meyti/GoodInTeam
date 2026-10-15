/**
 * Money is ALWAYS stored as an integer number of minor units (amountMinor)
 * together with an ISO-ish currency code. Never store floats for money.
 */
import { localeMeta, type Locale } from "@/i18n/config";
import { toLatinDigits } from "@/lib/format";

export const currencies = {
  IRT: { code: "IRT", decimals: 0, symbol: { fa: "تومان", en: "Toman" }, intl: null },
  IRR: { code: "IRR", decimals: 0, symbol: { fa: "ریال", en: "Rial" }, intl: null },
  USD: { code: "USD", decimals: 2, symbol: { fa: "دلار", en: "$" }, intl: "USD" },
  EUR: { code: "EUR", decimals: 2, symbol: { fa: "یورو", en: "€" }, intl: "EUR" },
  AED: { code: "AED", decimals: 2, symbol: { fa: "درهم", en: "AED" }, intl: "AED" },
  TRY: { code: "TRY", decimals: 2, symbol: { fa: "لیر", en: "₺" }, intl: "TRY" },
  GBP: { code: "GBP", decimals: 2, symbol: { fa: "پوند", en: "£" }, intl: "GBP" },
  USDT: { code: "USDT", decimals: 2, symbol: { fa: "تتر", en: "USDT" }, intl: null },
} as const;

export type CurrencyCode = keyof typeof currencies;
export const currencyCodes = Object.keys(currencies) as [CurrencyCode, ...CurrencyCode[]];

/** Own keys only — `"toString"` / `"__proto__"` are not currencies. */
export function isCurrency(v: unknown): v is CurrencyCode {
  return typeof v === "string" && Object.hasOwn(currencies, v);
}

/**
 * Normalize a typed number: Persian/Arabic-Indic digits → Latin, thousands
 * separators (`,` `٬` `_` spaces, bidi marks) removed, Arabic decimal separator `٫` → `.`,
 * Unicode minus `−` → `-`.
 */
export function normalizeNumberInput(input: string) {
  return toLatinDigits(input)
    .trim()
    .replace(/[,\s٬_\u200C\u200E\u200F]/g, "")
    .replace(/٫/g, ".")
    .replace(/\u2212/g, "-");
}

const PLAIN_DECIMAL = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Parse a plain decimal number as typed by a user ("12,500", "۱۲٬۵۰۰", "-3.5").
 * Returns null for anything else — hex (`0x10`), exponents (`1e3`), `Infinity`, junk.
 */
export function parseDecimalInput(input: string): number | null {
  const cleaned = normalizeNumberInput(input);
  if (!PLAIN_DECIMAL.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function toMinor(amount: number, currency: CurrencyCode) {
  return Math.round(amount * 10 ** currencies[currency].decimals);
}

export function fromMinor(minor: number, currency: CurrencyCode) {
  return minor / 10 ** currencies[currency].decimals;
}

/** Parse user input like "1,250.50" or "۱٬۲۵۰" into minor units. */
export function parseMoneyInput(input: string, currency: CurrencyCode): number | null {
  const n = parseDecimalInput(input);
  return n === null ? null : toMinor(n, currency);
}

export function formatMoney(
  minor: number,
  currency: string,
  locale: Locale,
  opts: { compact?: boolean } = {},
) {
  const c = isCurrency(currency) ? currencies[currency] : null;
  const decimals = c?.decimals ?? 2;
  const value = minor / 10 ** decimals;
  const nf = new Intl.NumberFormat(localeMeta[locale].intl, {
    minimumFractionDigits: opts.compact ? 0 : decimals,
    maximumFractionDigits: opts.compact ? 1 : decimals,
    notation: opts.compact ? "compact" : "standard",
  });
  const num = nf.format(value);
  const symbol = c ? c.symbol[locale] : currency;
  if (locale === "en" && c?.intl && !opts.compact) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c.intl }).format(value);
  }
  return locale === "fa" ? `${num} ${symbol}` : `${symbol} ${num}`;
}
