/**
 * Persian-aware search normalisation (pure, unit-tested), shared by the
 * client filters (Spotlight, Launchpad) and the server: the SQLite function
 * `fa_norm` (`server/db/client.ts`) applies the same rules to stored text, so
 * `textMatch()` (`server/db/search.ts`) finds «علی» when «علي» is typed.
 * Arabic yeh/kaf/teh marbuta → Persian forms, ZWNJ, tatweel and Arabic
 * diacritics removed, Persian and Arabic-Indic digits → ASCII, lower case,
 * collapsed whitespace.
 */
const CHAR_MAP: Record<string, string> = {
  ي: "ی", // ي → ی
  ى: "ی", // ى → ی
  ك: "ک", // ك → ک
  ة: "ه", // ة → ه
};

export function normalizeSearchText(s: string): string {
  return s
    .replace(/[يىكة]/g, (ch) => CHAR_MAP[ch]!)
    .replace(/[‌ـً-ٟ]/g, "")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Does `label` contain `query` once both are normalised? */
export function matchesQuery(label: string, query: string): boolean {
  return normalizeSearchText(label).includes(normalizeSearchText(query));
}

/**
 * `LIKE` pattern for "contains `q`" against `fa_norm(column)`, with `%`, `_`
 * and backslash escaped (pair it with `escape '\'`). Empty when `q`
 * normalises to "".
 */
export function containsPattern(q: string): string {
  const norm = normalizeSearchText(q);
  return norm ? `%${norm.replace(/[\\%_]/g, "\\$&")}%` : "";
}
