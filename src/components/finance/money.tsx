import { AlertTriangleIcon } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import type { Messages } from "@/i18n/messages";
import { localeMeta } from "@/i18n/config";
import { currencies, isCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Money display primitives (no hooks — usable from server and client components).
 * Amounts are integer minor units + currency; never mix currencies in one figure.
 */

const tones = {
  income: "text-[#118d57] dark:text-[#77ed8b]",
  expense: "text-[#b71d18] dark:text-[#ffac82]",
  muted: "text-muted-foreground",
  none: "",
} as const;

/**
 * Like `formatMoney` but with Intl sign handling (`signDisplay`): Persian gets
 * the CLDR "‎−۴۰ دلار" form (LRM-anchored minus that never detaches in RTL).
 */
export function formatMoneySigned(
  minor: number,
  currency: string,
  locale: Locale,
  opts: { compact?: boolean; signed?: boolean } = {},
) {
  const c = isCurrency(currency) ? currencies[currency] : null;
  const decimals = c?.decimals ?? 2;
  const value = minor / 10 ** decimals;
  const signDisplay = opts.signed ? "exceptZero" : "auto";
  if (locale === "en" && c?.intl && !opts.compact) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c.intl, signDisplay }).format(
      value,
    );
  }
  const num = new Intl.NumberFormat(localeMeta[locale].intl, {
    minimumFractionDigits: opts.compact ? 0 : decimals,
    maximumFractionDigits: opts.compact ? 1 : decimals,
    notation: opts.compact ? "compact" : "standard",
    signDisplay,
  }).format(value);
  const symbol = c ? c.symbol[locale] : currency;
  return locale === "fa" ? `${num} ${symbol}` : `${symbol} ${num}`;
}

export function Money({
  minor,
  currency,
  locale,
  compact,
  signed,
  tone = "none",
  className,
}: {
  minor: number;
  currency: string;
  locale: Locale;
  compact?: boolean;
  /** Show "+" for positive amounts too. */
  signed?: boolean;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn("whitespace-nowrap tabular-nums", tones[tone], className)}
      title={compact ? formatMoneySigned(minor, currency, locale, { signed }) : undefined}
    >
      {formatMoneySigned(minor, currency, locale, { compact, signed })}
    </span>
  );
}

/** Sort: base currency first, then alphabetically. */
export function sortCurrencies<T extends { currency: string }>(rows: T[], base?: string) {
  return [...rows].sort((a, b) =>
    a.currency === base ? -1 : b.currency === base ? 1 : a.currency.localeCompare(b.currency),
  );
}

/** One line per currency: the first is prominent, the others smaller (fits inside <p>). */
export function MoneyStack({
  rows,
  locale,
  base,
  compact,
  signed,
  tone,
  empty = "—",
  className,
  secondaryClassName,
}: {
  rows: { currency: string; minor: number }[];
  locale: Locale;
  base?: string;
  compact?: boolean;
  signed?: boolean;
  tone?: keyof typeof tones;
  empty?: string;
  className?: string;
  secondaryClassName?: string;
}) {
  const list = sortCurrencies(
    rows.filter((r) => r.minor !== 0),
    base,
  );
  if (!list.length) return <span className={cn("text-muted-foreground", className)}>{empty}</span>;
  return (
    <span className={cn("inline-flex flex-col gap-0.5", className)}>
      {list.map((r, i) => (
        <Money
          key={r.currency}
          minor={r.minor}
          currency={r.currency}
          locale={locale}
          compact={compact}
          signed={signed}
          tone={tone}
          className={
            i > 0 ? cn("text-[13px] font-semibold opacity-75", secondaryClassName) : undefined
          }
        />
      ))}
    </span>
  );
}

/**
 * "≈ 123 تومان" converted total. Currencies without a rate are flagged with a
 * small warning icon (details in its tooltip) or, with `missingText`, inline.
 */
export function Approx({
  value,
  base,
  locale,
  t,
  compact = true,
  missingText,
  className,
}: {
  value: { minor: number; missing: string[]; approximate?: boolean };
  base: string;
  locale: Locale;
  t: Messages["finance"];
  compact?: boolean;
  missingText?: boolean;
  className?: string;
}) {
  const missing = value.missing.length
    ? format(t.missingRates, { list: value.missing.join(locale === "fa" ? "، " : ", ") })
    : null;
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-1 text-xs text-muted-foreground", className)}
      title={missing ? `${t.approxHint} — ${missing}` : t.approxHint}
    >
      <span>
        ≈ <Money minor={value.minor} currency={base} locale={locale} compact={compact} />
      </span>
      {missing &&
        (missingText ? (
          <span className="text-[#b76e00] dark:text-[#ffd666]">· {missing}</span>
        ) : (
          <>
            <AlertTriangleIcon aria-hidden className="size-3.5 text-[#b76e00] dark:text-[#ffd666]" />
            <span className="sr-only">{missing}</span>
          </>
        ))}
    </span>
  );
}
