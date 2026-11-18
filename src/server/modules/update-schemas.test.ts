/**
 * Guard for docs/conventions.md → "Forms": an update schema never adds a value
 * the caller did not send.
 *
 * zod 4 keeps `.default()`s inside `.partial()`, so `createInput.partial()`
 * silently resets every omitted field that has a default (a page body wiped by
 * a title-only update, a pending transaction cleared by a new description…).
 *
 * The schemas are discovered from disk: every `update*Input` / `*PatchInput`
 * exported by a module's `schemas.ts` is checked, so a new module is covered
 * without touching this file.
 */
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { z } from "zod";

const modulesDir = path.dirname(fileURLToPath(import.meta.url));
const UPDATE_SCHEMA = /^update[A-Z]\w*Input$|PatchInput$/;

const b64 = (bytes: number) => Buffer.alloc(bytes, 7).toString("base64");

/**
 * Smallest valid input of the schemas that are not "everything optional but
 * the id". List ONLY keys the schema rejects when they are missing (the test
 * proves it) — a key that is accepted when absent must stay absent in the
 * output, it never belongs here.
 */
const REQUIRED: Record<string, Record<string, unknown>> = {
  // A lead status change has nothing else to send.
  "leads.updateLeadStatusInput": { id: "x", status: "contacted" },
  // "My account" is a full form, not a patch.
  "users.updateAccountInput": { name: "Sara", email: "sara@x.test", locale: "en" },
  // The vault replaces the whole encrypted blob (the server can't merge ciphertext).
  "vault.updateVaultItemInput": { id: "x", type: "login", ciphertext: b64(24), iv: b64(12) },
  // Key rotation: at least one of master / recovery.
  "vault.updateVaultKeysInput": {
    recovery: { recoverySalt: b64(16), recoveryWrappedKey: b64(48), recoveryIv: b64(12) },
  },
};

const found: [name: string, schema: z.ZodType][] = [];
for (const dirent of readdirSync(modulesDir, { withFileTypes: true })) {
  if (!dirent.isDirectory() || !existsSync(path.join(modulesDir, dirent.name, "schemas.ts")))
    continue;
  const exported = (await import(`./${dirent.name}/schemas.ts`)) as Record<string, unknown>;
  for (const [key, value] of Object.entries(exported)) {
    if (UPDATE_SCHEMA.test(key)) found.push([`${dirent.name}.${key}`, value as z.ZodType]);
  }
}
found.sort(([a], [b]) => a.localeCompare(b));

/** `{ id }` when the schema has an id, else `{}`. */
function idOnly(schema: z.ZodType): Record<string, unknown> {
  const shape = (schema as Partial<z.ZodObject>).shape;
  return shape && "id" in shape ? { id: "x" } : {};
}

describe("update schemas add nothing the caller didn't send", () => {
  it("finds the update schemas of every module", () => {
    const names = found.map(([name]) => name);
    // A floor, not a snapshot: discovery must not silently go empty.
    expect(names.length).toBeGreaterThanOrEqual(20);
    for (const name of [
      "calendar.updateEventInput",
      "clients.updateClientInput",
      "content.updatePostInput",
      "content.updateSeriesInput",
      "content.updateTestimonialInput",
      "contracts.updateContractInput",
      "docs.updateDocInput",
      "finance.updateAccountInput",
      "finance.updateCategoryInput",
      "finance.updateFxRateInput",
      "finance.updateInvoiceInput",
      "finance.updateTransactionInput",
      "projects.updateMilestoneInput",
      "projects.updateProjectInput",
      "settings.businessPatchInput",
      "settings.profilePatchInput",
      "tasks.updateTaskInput",
      "time.updateEntryInput",
    ])
      expect(names).toContain(name);
    // Every REQUIRED entry still names a real schema.
    for (const name of Object.keys(REQUIRED)) expect(names).toContain(name);
  });

  it.each(found)("%s", (name, schema) => {
    const minimal = REQUIRED[name] ?? idOnly(schema);
    const parsed = schema.safeParse(minimal);
    expect(
      parsed.success,
      `${name} rejects ${JSON.stringify(minimal)} — make the missing fields optional, or list ` +
        `the keys it really requires in REQUIRED`,
    ).toBe(true);
    // Strict: an injected default fails, and so does an extra `key: undefined`.
    expect(parsed.data).toStrictEqual(minimal);

    // REQUIRED may not hide an injected default: each listed key must be needed.
    for (const key of Object.keys(REQUIRED[name] ?? {})) {
      if (key === "id") continue;
      const { [key]: _omit, ...rest } = minimal;
      void _omit;
      expect(schema.safeParse(rest).success, `${name}: "${key}" is not required`).toBe(false);
    }
  });
});
