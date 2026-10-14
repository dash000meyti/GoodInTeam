import { createHash } from "node:crypto";

/**
 * Integrity primitives for contracts (node-only, no DB).
 * `contentHash = sha256(bodyMd)` (hex) pins the exact text a signer saw.
 */
export function contentHash(bodyMd: string) {
  return createHash("sha256").update(bodyMd, "utf8").digest("hex");
}

/** True when the stored hash still matches the stored body (tamper check). */
export function verifyContent(c: { bodyMd: string; contentHash: string | null }) {
  return !!c.contentHash && contentHash(c.bodyMd) === c.contentHash;
}

const PNG_PREFIX = "data:image/png;base64,";
/** ~150 KB of PNG → ~200k base64 characters. */
export const MAX_SIGNATURE_DATA_URL = 210_000;

/**
 * Validate a drawn-signature data URL: PNG only, bounded size, real PNG magic
 * bytes (so arbitrary payloads can't be stored and later rendered as <img>).
 */
export function isValidSignatureImage(dataUrl: string) {
  if (!dataUrl.startsWith(PNG_PREFIX) || dataUrl.length > MAX_SIGNATURE_DATA_URL) return false;
  const b64 = dataUrl.slice(PNG_PREFIX.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return false;
  const bytes = Buffer.from(b64.slice(0, 16), "base64");
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return magic.every((b, i) => bytes[i] === b);
}
