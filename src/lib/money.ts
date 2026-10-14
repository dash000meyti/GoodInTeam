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
export const currencyCodes = Object.keys(currencies) as CurrencyCode[];

export function isCurrency(v: unknown): v is CurrencyCode {
  return typeof v === "string" && v in currencies;
}

export function toMinor(amount: number, currency: CurrencyCode) {
  return Math.round(amount * 10 ** currencies[currency].decimals);
}

export function fromMinor(minor: number, currency: CurrencyCode) {
  return minor / 10 ** currencies[currency].decimals;
}

/** Parse user input like "1,250.50" or "۱٬۲۵۰" into minor units. */
export function parseMoneyInput(input: string, currency: CurrencyCode): number | null {
  const cleaned = toLatinDigits(input)
    .replace(/[,\s٬_]/g, "")
    .replace("٫", ".");
  if (!/^-?\d*(\.\d+)?$/.test(cleaned) || cleaned === "" || cleaned === "-") return null;
  return toMinor(Number.parseFloat(cleaned), currency);
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
