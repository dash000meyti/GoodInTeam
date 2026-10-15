import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import { clients, projects, vaultItems, vaultItemTypes, vaultKeys } from "@/server/db/schema";
import { assertStaff, isAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, notFound } from "@/server/errors";
import { projectAccessWhere } from "@/server/modules/projects/service";
import type {
  importVaultItemsInput,
  setupVaultInput,
  updateVaultItemInput,
  updateVaultKeysInput,
  vaultItemInput,
} from "./schemas";

/**
 * Zero-knowledge password vault.
 *
 * The server stores only KDF parameters, wrapped keys and AES-GCM ciphertexts
 * produced in the browser (see src/lib/vault-crypto.ts). It can never decrypt
 * anything. Authorization: every staff user (owner/admin/member) has exactly
 * one personal vault — nobody, not even the owner, can read someone else's.
 * Clients (portal users) have no vault.
 */

export type VaultItemType = (typeof vaultItemTypes)[number];

function assertVaultUser(actor: Actor) {
  assertStaff(actor);
}

const itemColumns = {
  id: vaultItems.id,
  type: vaultItems.type,
  projectId: vaultItems.projectId,
  clientId: vaultItems.clientId,
  favorite: vaultItems.favorite,
  ciphertext: vaultItems.ciphertext,
  iv: vaultItems.iv,
  lastViewedAt: vaultItems.lastViewedAt,
  createdAt: vaultItems.createdAt,
  updatedAt: vaultItems.updatedAt,
};

/** Keep `updated_at` untouched on metadata-only updates (favorite, last viewed). */
const keepUpdatedAt = () => ({ updatedAt: sql`"updated_at"` });

// ─── Keys ───────────────────────────────────────────────────────────────────

/** The caller's wrapped key material, or null when the vault isn't set up yet. */
export function getVaultKeys(actor: Actor) {
  assertVaultUser(actor);
  return (
    db
      .select({
        kdf: vaultKeys.kdf,
        iterations: vaultKeys.iterations,
        salt: vaultKeys.salt,
        wrappedKey: vaultKeys.wrappedKey,
        wrapIv: vaultKeys.wrapIv,
        recoverySalt: vaultKeys.recoverySalt,
        recoveryWrappedKey: vaultKeys.recoveryWrappedKey,
        recoveryIv: vaultKeys.recoveryIv,
        createdAt: vaultKeys.createdAt,
        updatedAt: vaultKeys.updatedAt,
      })
      .from(vaultKeys)
      .where(eq(vaultKeys.userId, actor.user.id))
      .get() ?? null
  );
}

function assertVaultExists(actor: Actor) {
  const row = db
    .select({ userId: vaultKeys.userId })
    .from(vaultKeys)
    .where(eq(vaultKeys.userId, actor.user.id))
    .get();
  if (!row) throw new AppError("conflict", "Vault is not set up");
}

export function setupVault(actor: Actor, input: z.output<typeof setupVaultInput>) {
  assertVaultUser(actor);
  const existing = db
    .select({ userId: vaultKeys.userId })
    .from(vaultKeys)
    .where(eq(vaultKeys.userId, actor.user.id))
    .get();
  // Never overwrite: a second setup would orphan every item encrypted with the first key.
  if (existing) throw new AppError("conflict", "Vault already exists");
  db.transaction((tx) => {
    // Items without keys are undecryptable leftovers (should not exist) — clear them.
    tx.delete(vaultItems).where(eq(vaultItems.userId, actor.user.id)).run();
    tx.insert(vaultKeys)
      .values({ userId: actor.user.id, ...input })
      .run();
  });
  logActivity(actor, "vault.setup", "vault", actor.user.id);
}

/** Re-wrapped key material after a master password change and/or recovery key rotation. */
export function updateVaultKeys(actor: Actor, input: z.output<typeof updateVaultKeysInput>) {
  assertVaultUser(actor);
  assertVaultExists(actor);
  db.update(vaultKeys)
    .set({ ...input.master, ...input.recovery })
    .where(eq(vaultKeys.userId, actor.user.id))
    .run();
  if (input.master) logActivity(actor, "vault.password_change", "vault", actor.user.id);
  if (input.recovery) logActivity(actor, "vault.recovery_rotate", "vault", actor.user.id);
}

/** Destroy the caller's vault (keys + items). Irreversible by design. */
export function resetVault(actor: Actor) {
  assertVaultUser(actor);
  const removed = db.transaction((tx) => {
    const n = tx.delete(vaultItems).where(eq(vaultItems.userId, actor.user.id)).run().changes;
    tx.delete(vaultKeys).where(eq(vaultKeys.userId, actor.user.id)).run();
    return n;
  });
  logActivity(actor, "vault.reset", "vault", actor.user.id, undefined, { items: removed });
}

// ─── Items ──────────────────────────────────────────────────────────────────

export function listVaultItems(actor: Actor) {
  assertVaultUser(actor);
  return db
    .select(itemColumns)
    .from(vaultItems)
    .where(eq(vaultItems.userId, actor.user.id))
    .orderBy(desc(vaultItems.favorite), asc(vaultItems.createdAt))
    .all();
}

export type VaultItemRow = ReturnType<typeof listVaultItems>[number];

/** Validate optional project/client links against what the caller may see. */
function checkLinks(
  actor: Actor,
  links: { projectId?: string | null; clientId?: string | null },
  mode: "strict" | "lenient",
) {
  let projectId = links.projectId ?? null;
  let clientId = links.clientId ?? null;
  if (projectId) {
    const ok = db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), projectAccessWhere(actor)))
      .get();
    if (!ok) {
      if (mode === "strict")
        throw new AppError("validation", "Unknown project", { projectId: ["Unknown project"] });
      projectId = null;
    }
  }
  if (clientId) {
    // Client records are admin-only data.
    const ok =
      isAdmin(actor) &&
      db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).get();
    if (!ok) {
      if (mode === "strict")
        throw new AppError("validation", "Unknown client", { clientId: ["Unknown client"] });
      clientId = null;
    }
  }
  return { projectId, clientId };
}

export function createVaultItem(actor: Actor, input: z.output<typeof vaultItemInput>) {
  assertVaultUser(actor);
  assertVaultExists(actor);
  const links = checkLinks(actor, input, "strict");
  const row = db
    .insert(vaultItems)
    .values({
      userId: actor.user.id,
      type: input.type,
      ...links,
      favorite: input.favorite ?? false,
      ciphertext: input.ciphertext,
      iv: input.iv,
    })
    .returning({ id: vaultItems.id, updatedAt: vaultItems.updatedAt })
    .get();
  logActivity(actor, "vault.item_create", "vault_item", row.id, undefined, { type: input.type });
  return row;
}

export function updateVaultItem(
  actor: Actor,
  { id, ...input }: z.output<typeof updateVaultItemInput>,
) {
  assertVaultUser(actor);
  const links = checkLinks(actor, input, "strict");
  const row = db
    .update(vaultItems)
    .set({
      type: input.type,
      ...links,
      ...(input.favorite !== undefined && { favorite: input.favorite }),
      ciphertext: input.ciphertext,
      iv: input.iv,
    })
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, actor.user.id)))
    .returning({ id: vaultItems.id, updatedAt: vaultItems.updatedAt })
    .get();
  if (!row) throw notFound("Vault item");
  logActivity(actor, "vault.item_update", "vault_item", id, undefined, { type: input.type });
  return row;
}

export function deleteVaultItem(actor: Actor, id: string) {
  assertVaultUser(actor);
  const row = db
    .delete(vaultItems)
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, actor.user.id)))
    .returning({ id: vaultItems.id })
    .get();
  if (!row) throw notFound("Vault item");
  logActivity(actor, "vault.item_delete", "vault_item", id);
}

export function setVaultItemFavorite(actor: Actor, id: string, favorite: boolean) {
  assertVaultUser(actor);
  const row = db
    .update(vaultItems)
    .set({ favorite, ...keepUpdatedAt() })
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, actor.user.id)))
    .returning({ id: vaultItems.id })
    .get();
  if (!row) throw notFound("Vault item");
}

/** Record that the owner opened an item (shown as "last viewed"). */
export function markVaultItemViewed(actor: Actor, id: string) {
  assertVaultUser(actor);
  db.update(vaultItems)
    .set({ lastViewedAt: new Date(), ...keepUpdatedAt() })
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, actor.user.id)))
    .run();
}

/**
 * Bulk insert items that the browser already encrypted with the current vault
 * key (restore from an encrypted backup). Items whose id already exists in the
 * caller's vault are skipped, so restoring the same backup twice is harmless.
 */
export function importVaultItems(actor: Actor, input: z.output<typeof importVaultItemsInput>) {
  assertVaultUser(actor);
  assertVaultExists(actor);
  const ids = input.items.map((i) => i.id).filter((id): id is string => !!id);
  const taken = new Map(
    ids.length
      ? db
          .select({ id: vaultItems.id, userId: vaultItems.userId })
          .from(vaultItems)
          .where(inArray(vaultItems.id, ids))
          .all()
          .map((r) => [r.id, r.userId])
      : [],
  );
  let imported = 0;
  let skipped = 0;
  db.transaction((tx) => {
    for (const item of input.items) {
      const owner = item.id ? taken.get(item.id) : undefined;
      if (owner === actor.user.id) {
        skipped++;
        continue;
      }
      const links = checkLinks(actor, item, "lenient");
      tx.insert(vaultItems)
        .values({
          // Keep the original id unless it belongs to someone else.
          ...(item.id && !owner ? { id: item.id } : {}),
          userId: actor.user.id,
          type: item.type,
          ...links,
          favorite: item.favorite ?? false,
          ciphertext: item.ciphertext,
          iv: item.iv,
        })
        .run();
      imported++;
    }
  });
  logActivity(actor, "vault.import", "vault", actor.user.id, undefined, { imported, skipped });
  return { imported, skipped };
}

// ─── Status (safe for AI tools: no secrets, no ciphertext) ──────────────────

export function vaultStatus(actor: Actor) {
  assertVaultUser(actor);
  const keys = db
    .select({ createdAt: vaultKeys.createdAt, updatedAt: vaultKeys.updatedAt })
    .from(vaultKeys)
    .where(eq(vaultKeys.userId, actor.user.id))
    .get();
  const rows = db
    .select({ type: vaultItems.type, n: count() })
    .from(vaultItems)
    .where(eq(vaultItems.userId, actor.user.id))
    .groupBy(vaultItems.type)
    .all();
  const byType = Object.fromEntries(vaultItemTypes.map((t) => [t, 0])) as Record<
    VaultItemType,
    number
  >;
  for (const r of rows) byType[r.type] = r.n;
  const favorites =
    db
      .select({ n: count() })
      .from(vaultItems)
      .where(and(eq(vaultItems.userId, actor.user.id), eq(vaultItems.favorite, true)))
      .get()?.n ?? 0;
  return {
    setUp: !!keys,
    itemCount: rows.reduce((s, r) => s + r.n, 0),
    byType,
    favorites,
    createdAt: keys?.createdAt ?? null,
    keysUpdatedAt: keys?.updatedAt ?? null,
    note: "Zero-knowledge vault: item titles and secrets are encrypted in the owner's browser and are never available to the server or to API tools.",
  };
}
