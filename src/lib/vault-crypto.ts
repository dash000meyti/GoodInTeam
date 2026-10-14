/**
 * Zero-knowledge vault cryptography. Isomorphic (browser + Node ≥ 20) and built
 * on Web Crypto only — no dependencies. See docs/modules/vault.md.
 *
 *   master password ──PBKDF2-SHA256 (600k, 16-byte salt)──► KEK (AES-GCM 256, non-extractable)
 *   recovery key    ──PBKDF2-SHA256 (100k, 16-byte salt)──► RKEK
 *   vault key (random AES-GCM 256) is stored on the server ONLY wrapped by KEK and by RKEK.
 *   items: AES-GCM(vault key, random 96-bit IV, JSON payload)
 *
 * The server only ever receives salts, IVs, wrapped keys and ciphertexts.
 */

export const VAULT_KDF = "PBKDF2-SHA256" as const;
export const MASTER_ITERATIONS = 600_000;
/**
 * Fixed: the recovery key is 256 bits of randomness, so a lower work factor is
 * fine. Never change this value — it is not stored per vault, and existing
 * recovery keys would stop working.
 */
export const RECOVERY_ITERATIONS = 100_000;
export const MIN_ITERATIONS = 100_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const KEY_BYTES = 32;
/** AES-GCM output = plaintext + 16-byte tag. */
export const WRAPPED_KEY_BYTES = KEY_BYTES + 16;
export const RECOVERY_KEY_BYTES = 32;

export type VaultCryptoErrorCode =
  "unsupported" | "bad_secret" | "corrupt" | "invalid_recovery_key" | "no_recovery";

export class VaultCryptoError extends Error {
  constructor(
    public code: VaultCryptoErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "VaultCryptoError";
  }
}

type Bytes = Uint8Array<ArrayBuffer>;

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new VaultCryptoError(
      "unsupported",
      "Web Crypto is unavailable (the vault needs HTTPS or localhost).",
    );
  }
  return c.subtle;
}

/** True when this environment can run the vault (secure context + SubtleCrypto). */
export function isVaultCryptoAvailable() {
  return typeof globalThis.crypto?.subtle?.importKey === "function";
}

// ─── Encoding ───────────────────────────────────────────────────────────────

export function randomBytes(n: number): Bytes {
  const out = new Uint8Array(n);
  // getRandomValues is limited to 65,536 bytes per call.
  for (let i = 0; i < n; i += 65_536) {
    globalThis.crypto.getRandomValues(out.subarray(i, Math.min(n, i + 65_536)));
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function base64ToBytes(b64: string): Bytes {
  let bin: string;
  try {
    bin = atob(b64.trim());
  } catch {
    throw new VaultCryptoError("corrupt", "Invalid base64");
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Persian (۰-۹) and Arabic-Indic (٠-٩) digits → ASCII, so keyboard layout doesn't matter. */
export function latinDigits(s: string) {
  return s
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Canonical form of a typed password before key derivation: Unicode NFC and
 * ASCII digits. NEVER change this — existing vaults depend on it.
 */
export function normalizePassword(password: string) {
  return latinDigits(password.normalize("NFC"));
}

/** RFC 4648 base32 without padding. */
export function base32Encode(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += B32[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(buffer << (5 - bits)) & 31];
  return out;
}

/**
 * RFC 4648 base32 decode. Case-insensitive; ignores spaces, dashes and `=`
 * padding. Returns null on any other character.
 */
export function base32Decode(input: string): Bytes | null {
  const clean = input.toUpperCase().replace(/[\s\-=]/g, "");
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = B32.indexOf(ch);
    if (v < 0) return null;
    buffer = ((buffer << 5) | v) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

// ─── Primitives ─────────────────────────────────────────────────────────────

/**
 * Derive a key-encryption key from a secret (master password string or raw
 * recovery key bytes). The KEK is non-extractable and can only wrap/unwrap.
 */
export async function deriveKek(
  secret: string | Uint8Array,
  salt: Uint8Array,
  iterations = MASTER_ITERATIONS,
): Promise<CryptoKey> {
  const material: Bytes =
    typeof secret === "string"
      ? new TextEncoder().encode(normalizePassword(secret))
      : new Uint8Array(secret);
  const base = await subtle().importKey("raw", material, "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

/** A fresh random 256-bit vault key (extractable, so it can be wrapped). */
export function generateVaultKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]) as Promise<CryptoKey>;
}

export interface WrappedKey {
  wrappedKey: string;
  iv: string;
}

export async function wrapKey(vaultKey: CryptoKey, kek: CryptoKey): Promise<WrappedKey> {
  const iv = randomBytes(IV_BYTES);
  const wrapped = await subtle().wrapKey("raw", vaultKey, kek, { name: "AES-GCM", iv });
  return { wrappedKey: bytesToBase64(new Uint8Array(wrapped)), iv: bytesToBase64(iv) };
}

/**
 * Unwrap the vault key. Throws `VaultCryptoError("bad_secret")` when the KEK is
 * wrong (AES-GCM authentication fails). Session keys should be unwrapped
 * non-extractable; only re-wrapping flows need `extractable: true`.
 */
export async function unwrapKey(
  wrapped: WrappedKey,
  kek: CryptoKey,
  extractable = false,
): Promise<CryptoKey> {
  try {
    return await subtle().unwrapKey(
      "raw",
      base64ToBytes(wrapped.wrappedKey),
      kek,
      { name: "AES-GCM", iv: base64ToBytes(wrapped.iv) },
      { name: "AES-GCM", length: 256 },
      extractable,
      ["encrypt", "decrypt"],
    );
  } catch (err) {
    if (err instanceof VaultCryptoError) throw err;
    throw new VaultCryptoError("bad_secret", "Wrong password or key");
  }
}

/** Turn an extractable vault key into a non-extractable session key. */
export async function toSessionKey(vaultKey: CryptoKey): Promise<CryptoKey> {
  if (!vaultKey.extractable) return vaultKey;
  const raw = new Uint8Array(await subtle().exportKey("raw", vaultKey));
  try {
    return await subtle().importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
  } finally {
    raw.fill(0);
  }
}

export interface EncryptedBlob {
  ciphertext: string;
  iv: string;
}

/** AES-GCM encrypt a JSON-serialisable value with a fresh random IV. */
export async function encryptItem(key: CryptoKey, payload: unknown): Promise<EncryptedBlob> {
  const iv = randomBytes(IV_BYTES);
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, plain);
  return { ciphertext: bytesToBase64(new Uint8Array(ct)), iv: bytesToBase64(iv) };
}

/** Decrypt + JSON.parse. Throws `VaultCryptoError("corrupt")` on any failure. */
export async function decryptItem<T = unknown>(key: CryptoKey, blob: EncryptedBlob): Promise<T> {
  try {
    const plain = await subtle().decrypt(
      { name: "AES-GCM", iv: base64ToBytes(blob.iv) },
      key,
      base64ToBytes(blob.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    throw new VaultCryptoError("corrupt", "Item could not be decrypted");
  }
}

// ─── Recovery key ───────────────────────────────────────────────────────────

const RECOVERY_CHARS = Math.ceil((RECOVERY_KEY_BYTES * 8) / 5); // 52

/** Group a base32 string as XXXX-XXXX-… for display. */
export function formatRecoveryKey(raw: string) {
  const clean = raw.toUpperCase().replace(/[^A-Z2-7]/g, "");
  return clean.match(/.{1,4}/g)?.join("-") ?? "";
}

/** 32 random bytes rendered as 13 groups of 4 base32 characters. */
export function generateRecoveryKey(): string {
  return formatRecoveryKey(base32Encode(randomBytes(RECOVERY_KEY_BYTES)));
}

/**
 * Parse a typed/pasted recovery key → its 32 bytes, or null when the format is
 * wrong. Tolerates lowercase, spaces/dashes and common look-alikes (0→O, 1→I, 8→B).
 */
export function parseRecoveryKey(input: string): Bytes | null {
  const clean = latinDigits(input)
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/8/g, "B");
  if (clean.length !== RECOVERY_CHARS || !/^[A-Z2-7]+$/.test(clean)) return null;
  const bytes = base32Decode(clean);
  return bytes && bytes.length === RECOVERY_KEY_BYTES ? bytes : null;
}

// ─── High-level flows ───────────────────────────────────────────────────────

/** What the server stores in `vault_keys` (all values are public / ciphertext). */
export interface VaultKeyMaterial {
  kdf: string;
  iterations: number;
  salt: string;
  wrappedKey: string;
  wrapIv: string;
  recoverySalt: string | null;
  recoveryWrappedKey: string | null;
  recoveryIv: string | null;
}

export interface MasterWrap {
  kdf: typeof VAULT_KDF;
  iterations: number;
  salt: string;
  wrappedKey: string;
  wrapIv: string;
}

export interface RecoveryWrap {
  recoverySalt: string;
  recoveryWrappedKey: string;
  recoveryIv: string;
}

/** Wrap the vault key with a (new) master password. */
export async function wrapWithPassword(
  vaultKey: CryptoKey,
  password: string,
  iterations = MASTER_ITERATIONS,
): Promise<MasterWrap> {
  const salt = randomBytes(SALT_BYTES);
  const kek = await deriveKek(password, salt, iterations);
  const { wrappedKey, iv } = await wrapKey(vaultKey, kek);
  return { kdf: VAULT_KDF, iterations, salt: bytesToBase64(salt), wrappedKey, wrapIv: iv };
}

/** Wrap the vault key with a recovery key (as produced by generateRecoveryKey). */
export async function wrapWithRecoveryKey(
  vaultKey: CryptoKey,
  recoveryKey: string,
  iterations = RECOVERY_ITERATIONS,
): Promise<RecoveryWrap> {
  const bytes = parseRecoveryKey(recoveryKey);
  if (!bytes) throw new VaultCryptoError("invalid_recovery_key");
  const salt = randomBytes(SALT_BYTES);
  const kek = await deriveKek(bytes, salt, iterations);
  const { wrappedKey, iv } = await wrapKey(vaultKey, kek);
  bytes.fill(0);
  return { recoverySalt: bytesToBase64(salt), recoveryWrappedKey: wrappedKey, recoveryIv: iv };
}

/**
 * Create a brand-new vault: random vault key, wrapped by the master password
 * and by a fresh recovery key. Returns the session key (non-extractable).
 */
export async function createVaultKeys(
  password: string,
  opts: { iterations?: number; recoveryIterations?: number } = {},
): Promise<{ material: MasterWrap & RecoveryWrap; recoveryKey: string; sessionKey: CryptoKey }> {
  const vaultKey = await generateVaultKey();
  const recoveryKey = generateRecoveryKey();
  const master = await wrapWithPassword(vaultKey, password, opts.iterations);
  const recovery = await wrapWithRecoveryKey(vaultKey, recoveryKey, opts.recoveryIterations);
  const sessionKey = await toSessionKey(vaultKey);
  return { material: { ...master, ...recovery }, recoveryKey, sessionKey };
}

function assertKdf(material: Pick<VaultKeyMaterial, "kdf" | "iterations">) {
  if (material.kdf !== VAULT_KDF || !(material.iterations >= 1)) {
    throw new VaultCryptoError("unsupported", `Unsupported KDF ${material.kdf}`);
  }
}

/** Master password → vault key. Throws VaultCryptoError("bad_secret") when wrong. */
export async function unlockWithPassword(
  material: VaultKeyMaterial,
  password: string,
  extractable = false,
): Promise<CryptoKey> {
  assertKdf(material);
  const kek = await deriveKek(password, base64ToBytes(material.salt), material.iterations);
  return unwrapKey({ wrappedKey: material.wrappedKey, iv: material.wrapIv }, kek, extractable);
}

/** Recovery key → vault key. Throws invalid_recovery_key / bad_secret / no_recovery. */
export async function unlockWithRecoveryKey(
  material: VaultKeyMaterial,
  recoveryKey: string,
  extractable = false,
  iterations = RECOVERY_ITERATIONS,
): Promise<CryptoKey> {
  if (!material.recoverySalt || !material.recoveryWrappedKey || !material.recoveryIv) {
    throw new VaultCryptoError("no_recovery");
  }
  const bytes = parseRecoveryKey(recoveryKey);
  if (!bytes) throw new VaultCryptoError("invalid_recovery_key");
  const kek = await deriveKek(bytes, base64ToBytes(material.recoverySalt), iterations);
  bytes.fill(0);
  return unwrapKey(
    { wrappedKey: material.recoveryWrappedKey, iv: material.recoveryIv },
    kek,
    extractable,
  );
}
