/**
 * Server reference ids, as far as the proxy needs to understand them.
 *
 * Next.js gives an id to every server action AND to every `'use cache'`
 * function, and its action dispatcher loads either kind. A cached function is
 * meant to be called by our own server code only, so the proxy refuses any
 * request that names one as the action to run (src/proxy.ts).
 *
 * The id format belongs to Next.js (`next/dist/shared/lib/server-reference-info`):
 * 42 hex characters whose first byte is an info byte; bit 7 of that byte is
 * the type (1 = `'use cache'`, 0 = server action). `server-reference.test.ts`
 * compares this module with Next's own parser for every info byte, and an e2e
 * spec compares it with the built manifest, so a format change fails a test.
 *
 * Pure module: the proxy imports it.
 */
export const SERVER_REFERENCE_ID_LENGTH = 42;

const ID_SHAPE = /^[0-9a-f]{42}$/i;
const ID_IN_TEXT = /[0-9a-f]{42}/gi;

/** True for a well-formed server reference id of a `'use cache'` function. */
export function isCacheReferenceId(id: string | null | undefined) {
  if (!id || !ID_SHAPE.test(id)) return false;
  return (parseInt(id.slice(0, 2), 16) & 0x80) !== 0;
}

/** The ids a `Next-Action` header names (repeated headers arrive comma-joined). */
export function actionHeaderIds(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function textNamesCacheReference(text: string) {
  return (text.match(ID_IN_TEXT) ?? []).some(isCacheReferenceId);
}

function jsonNamesCacheReference(value: unknown, depth = 0): boolean {
  if (typeof value === "string") return textNamesCacheReference(value);
  if (!value || typeof value !== "object" || depth > 8) return false;
  return Object.entries(value).some(
    ([k, v]) => textNamesCacheReference(k) || jsonNamesCacheReference(v, depth + 1),
  );
}

/**
 * A form posted without JavaScript names its action in the field names
 * (`$ACTION_ID_<id>`) or in an action descriptor (`$ACTION_REF_<n>` with the
 * id inside the `$ACTION_<n>:…` fields). True when any of those names a cache
 * reference. Looks at every `$ACTION…` field, decoded the way a JSON parser
 * would read it, so an id cannot hide behind an escape or a duplicate key.
 */
export function formNamesCacheReference(form: FormData) {
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("$ACTION")) continue;
    if (textNamesCacheReference(key)) return true;
    if (typeof value !== "string") continue;
    if (textNamesCacheReference(value)) return true;
    try {
      if (jsonNamesCacheReference(JSON.parse(value))) return true;
    } catch {
      // Not JSON: the raw text was checked above.
    }
  }
  return false;
}
