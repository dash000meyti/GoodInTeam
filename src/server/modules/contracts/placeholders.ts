/**
 * `{{placeholder}}` templating for contract bodies — pure, unit-tested.
 *
 * - Keys are dotted identifiers: `{{client.name}}`, `{{project.dueDate}}`, `{{fee}}`.
 * - Known keys with a value are replaced; everything else is LEFT VISIBLE so the
 *   owner notices it (the editor and document view highlight leftovers).
 * - Values are inserted verbatim (they are markdown text like the body).
 */

export const PLACEHOLDER_RE = /\{\{\s*([A-Za-z][\w]*(?:\.[A-Za-z][\w]*)*)\s*\}\}/g;

/** Built-in keys filled from the selected client / project / settings. */
export const BUILTIN_PLACEHOLDERS = [
  "client.name",
  "client.email",
  "client.phone",
  "client.address",
  "project.name",
  "project.budget",
  "project.startDate",
  "project.dueDate",
  "owner.name",
  "brand.name",
  "today",
] as const;
export type BuiltinPlaceholder = (typeof BUILTIN_PLACEHOLDERS)[number];

export type PlaceholderValues = Record<string, string | null | undefined>;

/** Unique placeholder keys used in a text, in order of first appearance. */
export function extractPlaceholders(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(PLACEHOLDER_RE)) seen.add(m[1]!);
  return [...seen];
}

/**
 * Replace placeholders that have a non-empty value. Returns the new text and
 * the keys that are still unresolved (unknown or without a value).
 */
export function fillPlaceholders(text: string, values: PlaceholderValues) {
  const unresolved = new Set<string>();
  const out = text.replace(PLACEHOLDER_RE, (whole, key: string) => {
    const v = values[key];
    if (v == null || v.trim() === "") {
      unresolved.add(key);
      return whole;
    }
    return v;
  });
  return { text: out, unresolved: [...unresolved] };
}

/**
 * Wrap leftover `{{key}}` occurrences in rendered (already escaped) HTML with a
 * highlight. Only touches text nodes; skips <pre>/<code> blocks and attributes.
 */
export function highlightPlaceholdersHtml(html: string) {
  const mark = (text: string) =>
    text.replace(
      PLACEHOLDER_RE,
      (whole) => `<mark class="gt-placeholder" data-placeholder>${whole}</mark>`,
    );
  return html
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/g)
    .map((block, i) =>
      i % 2 === 1
        ? block
        : block
            .split(/(<[^>]*>)/g)
            .map((piece, j) => (j % 2 === 1 ? piece : mark(piece)))
            .join(""),
    )
    .join("");
}

/**
 * Guess the document language from its text: any Persian/Arabic letters → "fa".
 * Used to format dates/money in templates and to set the document direction.
 */
export function detectDocLocale(text: string): "fa" | "en" {
  const sample = text.replace(PLACEHOLDER_RE, " ").slice(0, 4000);
  const fa = (sample.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (fa === 0) return "en";
  return fa * 2 >= latin ? "fa" : "en";
}
