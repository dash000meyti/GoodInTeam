/**
 * TOTP (RFC 6238) / HOTP (RFC 4226) on Web Crypto. Isomorphic, no dependencies.
 * Defaults: SHA-1, 30-second period, 6 digits (what every authenticator uses).
 * Accepts raw base32 secrets ("JBSW Y3DP EHPK 3PXP") and otpauth:// URIs.
 */
import { base32Decode } from "./vault-crypto";

export type TotpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export interface TotpParams {
  secret: Uint8Array<ArrayBuffer>;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
  issuer?: string;
  account?: string;
}

const DEFAULTS = { algorithm: "SHA-1" as TotpAlgorithm, digits: 6, period: 30 };

function normalizeAlgorithm(v: string | null | undefined): TotpAlgorithm | null {
  if (!v) return DEFAULTS.algorithm;
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s === "SHA1") return "SHA-1";
  if (s === "SHA256") return "SHA-256";
  if (s === "SHA512") return "SHA-512";
  return null;
}

/** Parse an `otpauth://totp/Issuer:account?secret=…&issuer=…` URI. */
export function parseOtpauthUri(uri: string): TotpParams | null {
  let url: URL;
  try {
    url = new URL(uri.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "otpauth:" || url.host.toLowerCase() !== "totp") return null;
  const q = url.searchParams;
  const secret = base32Decode(q.get("secret") ?? "");
  if (!secret || secret.length === 0) return null;
  const algorithm = normalizeAlgorithm(q.get("algorithm"));
  const digits = Number(q.get("digits") ?? DEFAULTS.digits);
  const period = Number(q.get("period") ?? DEFAULTS.period);
  if (!algorithm || !Number.isInteger(digits) || digits < 6 || digits > 10) return null;
  if (!Number.isInteger(period) || period < 1 || period > 600) return null;
  const label = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const [labelIssuer, labelAccount] = label.includes(":")
    ? [label.slice(0, label.indexOf(":")), label.slice(label.indexOf(":") + 1)]
    : [undefined, label];
  return {
    secret,
    algorithm,
    digits,
    period,
    issuer: q.get("issuer") ?? labelIssuer?.trim() ?? undefined,
    account: labelAccount?.trim() || undefined,
  };
}

/**
 * Parse whatever the user pasted into the "TOTP" field: an otpauth:// URI or a
 * base32 secret (spaces/dashes allowed). Returns null when unusable.
 */
export function parseTotp(input: string | null | undefined): TotpParams | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  if (/^otpauth:/i.test(v)) return parseOtpauthUri(v);
  const secret = base32Decode(v);
  // Real secrets are ≥ 80 bits; anything shorter is almost certainly a typo.
  if (!secret || secret.length < 10) return null;
  return { secret, ...DEFAULTS };
}

function counterBytes(counter: number) {
  const buf = new Uint8Array(8);
  let hi = Math.floor(counter / 2 ** 32);
  let lo = counter >>> 0;
  for (let i = 7; i >= 4; i--) {
    buf[i] = lo & 0xff;
    lo >>>= 8;
  }
  for (let i = 3; i >= 0; i--) {
    buf[i] = hi & 0xff;
    hi >>>= 8;
  }
  return buf;
}

/** RFC 4226 HOTP value for a counter. */
export async function hotp(
  secret: Uint8Array<ArrayBuffer>,
  counter: number,
  opts: { algorithm?: TotpAlgorithm; digits?: number } = {},
): Promise<string> {
  const algorithm = opts.algorithm ?? DEFAULTS.algorithm;
  const digits = opts.digits ?? DEFAULTS.digits;
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(
    await globalThis.crypto.subtle.sign("HMAC", key, counterBytes(counter)),
  );
  const offset = mac[mac.length - 1]! & 0x0f;
  const bin =
    ((mac[offset]! & 0x7f) << 24) |
    (mac[offset + 1]! << 16) |
    (mac[offset + 2]! << 8) |
    mac[offset + 3]!;
  return String(bin % 10 ** digits).padStart(digits, "0");
}

/** Current TOTP code and seconds left in the current period. */
export async function totp(
  params: TotpParams,
  nowMs = Date.now(),
): Promise<{ code: string; remaining: number; period: number }> {
  const seconds = Math.floor(nowMs / 1000);
  const counter = Math.floor(seconds / params.period);
  const code = await hotp(params.secret, counter, params);
  return { code, remaining: params.period - (seconds % params.period), period: params.period };
}

/** "123456" → "123 456" (and 8 digits → "1234 5678") for readability. */
export function formatTotpCode(code: string) {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)} ${code.slice(half)}`;
}
