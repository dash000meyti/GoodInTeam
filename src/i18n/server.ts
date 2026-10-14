import "server-only";
import { locale as rootLocale } from "next/root-params";
import { isLocale, type Locale } from "./config";
import { messages, type Messages, type Namespace } from "./messages";

/** Current locale from the `[locale]` root segment (server components only). */
export async function getLocale(): Promise<Locale> {
  const l = await rootLocale();
  return isLocale(l) ? l : "fa";
}

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

/** Convenience: `const t = await getT()` then `t.common.save`. */
export async function getT() {
  return getMessages(await getLocale());
}

/** Subset of namespaces to ship to the client (keeps RSC payload small). */
export function pickMessages<N extends Namespace>(locale: Locale, namespaces: readonly N[]) {
  const all = messages[locale];
  const out = {} as Pick<Messages, N>;
  for (const ns of namespaces) out[ns] = all[ns];
  return out;
}
