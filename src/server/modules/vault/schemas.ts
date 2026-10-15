import { z } from "zod";
import { vaultItemTypes } from "@/server/db/schema";
import { zId, zNullString } from "@/lib/zod-helpers";

/**
 * The vault is zero-knowledge: every input here is either public KDF
 * parameters or base64 ciphertext produced in the browser. We validate shapes
 * and sizes only — the server cannot (and must not) look inside.
 */

const B64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Decoded byte length of a well-formed base64 string. */
function b64Bytes(s: string) {
  const pad = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return (s.length / 4) * 3 - pad;
}

/** Base64 string, optionally with an exact decoded length. */
const zB64 = (opts: { bytes?: number; max?: number } = {}) =>
  z
    .string()
    .max(opts.max ?? 200)
    .regex(B64, "Invalid base64")
    .refine((s) => s.length % 4 === 0, "Invalid base64")
    .refine((s) => opts.bytes === undefined || b64Bytes(s) === opts.bytes, "Invalid length");

const zSalt = zB64({ bytes: 16 });
const zIv = zB64({ bytes: 12 });
/** 32-byte key + 16-byte GCM tag. */
const zWrapped = zB64({ bytes: 48 });
/** ~700 KB of base64 ≈ 512 KB of encrypted JSON per item. */
const zCiphertext = zB64({ max: 700_000 }).refine((s) => s.length >= 24, "Too short");

export const masterWrapInput = z.object({
  kdf: z.literal("PBKDF2-SHA256"),
  iterations: z.coerce.number().int().min(100_000).max(10_000_000),
  salt: zSalt,
  wrappedKey: zWrapped,
  wrapIv: zIv,
});

export const recoveryWrapInput = z.object({
  recoverySalt: zSalt,
  recoveryWrappedKey: zWrapped,
  recoveryIv: zIv,
});

/** First-time setup: both wraps are required. */
export const setupVaultInput = masterWrapInput.extend(recoveryWrapInput.shape);

/** Change master password and/or rotate the recovery key (vault key unchanged). */
export const updateVaultKeysInput = z
  .object({ master: masterWrapInput.optional(), recovery: recoveryWrapInput.optional() })
  .refine((v) => v.master || v.recovery, "Nothing to update");

const itemFields = {
  type: z.enum(vaultItemTypes),
  projectId: zNullString(64),
  clientId: zNullString(64),
  favorite: z.boolean().optional(),
  ciphertext: zCiphertext,
  iv: zIv,
};

export const vaultItemInput = z.object(itemFields);
export type VaultItemInput = z.input<typeof vaultItemInput>;

export const updateVaultItemInput = z.object({ id: zId, ...itemFields });

export const vaultItemFavoriteInput = z.object({ id: zId, favorite: z.boolean() });

/** Restore/import: ids are kept when free so re-importing the same backup is idempotent. */
export const importVaultItemsInput = z.object({
  items: z
    .array(
      z.object({
        id: zId.optional(),
        ...itemFields,
      }),
    )
    .max(5_000),
});

export const resetVaultInput = z.object({ confirm: z.literal(true) });
