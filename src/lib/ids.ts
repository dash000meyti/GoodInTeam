import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"; // Crockford-ish, no i/l/o/u

/**
 * Short, URL-safe, lowercase random id (16 chars ≈ 80 bits).
 * Used as primary key for every table. Server-only (node:crypto).
 */
export function newId(size = 16) {
  const bytes = randomBytes(size);
  let out = "";
  for (let i = 0; i < size; i++) out += ALPHABET[bytes[i]! & 31];
  return out;
}

/** Long unguessable token for share links / sessions (base64url, 256 bits). */
export function newToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}
