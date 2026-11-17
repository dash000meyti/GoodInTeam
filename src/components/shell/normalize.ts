/**
 * Persian-aware query normalisation for client-side filters (Spotlight quick
 * links; pure, unit-tested). Arabic yeh/kaf/teh marbuta → Persian forms, ZWNJ,
 * tatweel and Arabic diacritics removed, Persian and Arabic-Indic digits →
 * ASCII, lower case, collapsed whitespace.
 */
const CHAR_MAP: Record<string, string> = {
  ي: "ی", // ي → ی
  ى: "ی", // ى → ی
  ك: "ک", // ك → ک
  ة: "ه", // ة → ه
};

export function normalizeQuery(s: string): string {
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
  return normalizeQuery(label).includes(normalizeQuery(query));
}
