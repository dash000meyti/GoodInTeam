import { or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { containsPattern } from "@/lib/search-text";

/**
 * Persian-aware "contains" search over one or more columns: both sides go
 * through the same normaliser (`lib/search-text.ts`; stored text via the
 * SQLite function `fa_norm`), so «علي»/«علی», «كد»/«کد», «می‌خواهم»/«میخواهم»
 * and «۱۴۰۵»/«1405» match each other. `%` and `_` in the query are literal.
 * Returns `undefined` for an empty query, so it drops straight into `and()`.
 */
export function textMatch(q: string | null | undefined, ...cols: SQLWrapper[]): SQL | undefined {
  const pattern = q ? containsPattern(q) : "";
  if (!pattern || !cols.length) return undefined;
  return or(...cols.map((c) => sql`fa_norm(${c}) like ${pattern} escape '\\'`));
}
