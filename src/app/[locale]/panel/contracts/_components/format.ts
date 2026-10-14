import type { Messages } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { formatNumber } from "@/lib/format";

/** 2.5 days / 5 hours / 40 min — for "average time to sign". */
export function formatSpan(ms: number, locale: Locale, t: Messages["contracts"]) {
  const n = (v: number) => formatNumber(v, locale, { maximumFractionDigits: 1 });
  if (ms >= 86_400_000) return format(t.durDays, { n: n(ms / 86_400_000) });
  if (ms >= 3_600_000) return format(t.durHours, { n: n(ms / 3_600_000) });
  return format(t.durMinutes, { n: n(Math.max(1, Math.round(ms / 60_000))) });
}

/** Human label for a placeholder key ("client.name" → "Client name"). */
export function placeholderLabel(key: string, t: Messages["contracts"]) {
  const k = `ph_${key.replace(".", "_")}` as keyof Messages["contracts"];
  return k in t ? t[k] : key;
}
