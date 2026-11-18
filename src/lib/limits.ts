/**
 * Request size limits shared by the browser and the server. Pure module.
 *
 * Every server action is a public POST endpoint with ONE body limit
 * (`serverActions.bodySizeLimit` in next.config.ts; src/proxy.test.ts checks
 * that it equals `ACTION_BODY_LIMIT_BYTES`). The limit is sized for the
 * largest ordinary save: a 500,000-character page, a 400,000-character post,
 * a vault item of 700,000 characters of ciphertext. Anything larger does not
 * go through an action: files are uploaded to `POST /api/media`, a vault
 * backup is restored in batches, a CSV import has the limit below.
 */
export const ACTION_BODY_LIMIT_BYTES = 2 * 1024 * 1024;

/** Longest CSV text one import accepts (finance/schemas.ts). */
export const MAX_IMPORT_CSV_CHARS = 1_000_000;

/** Room for the rest of the request around one large string (ids, field names). */
const ENVELOPE_BYTES = 16 * 1024;

/**
 * True when `text` can travel as one field of a server action: its JSON form,
 * in UTF-8 bytes, fits the body limit. Persian text takes two bytes per
 * letter, so a character count alone cannot answer this.
 */
export function fitsActionBody(text: string) {
  const bytes = new TextEncoder().encode(JSON.stringify(text)).byteLength;
  return bytes <= ACTION_BODY_LIMIT_BYTES - ENVELOPE_BYTES;
}
