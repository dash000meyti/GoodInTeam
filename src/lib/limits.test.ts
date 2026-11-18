import { describe, expect, it } from "vitest";
import { restoreBatches, RESTORE_BATCH_CHARS } from "@/components/vault/formats";
import { updatePostInput } from "@/server/modules/content/schemas";
import { updateDocInput } from "@/server/modules/docs/schemas";
import { importCsvInput } from "@/server/modules/finance/schemas";
import { vaultItemInput } from "@/server/modules/vault/schemas";
import { ACTION_BODY_LIMIT_BYTES, MAX_IMPORT_CSV_CHARS, fitsActionBody } from "./limits";

const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;

describe("ordinary saves fit the server-action body limit", () => {
  // The maximum of each large field, as Persian text (two bytes per letter)
  // with line breaks, which JSON spells as two characters.
  const LINE = "سلام دنیا، این یک متن است\n";
  const persian = (chars: number) => LINE.repeat(Math.ceil(chars / LINE.length)).slice(0, chars);

  it("a page (docs) at its maximum length", () => {
    const max = 500_000;
    const input = { id: "fekm18msc2d7awys", title: "ع".repeat(200), contentMd: persian(max) };
    expect(input.contentMd).toHaveLength(max);
    expect(updateDocInput.safeParse(input).success).toBe(true);
    expect(updateDocInput.safeParse({ ...input, contentMd: `${input.contentMd}!` }).success).toBe(
      false,
    );
    expect(bytes([input])).toBeLessThan(ACTION_BODY_LIMIT_BYTES);
  });

  it("a post at its maximum length", () => {
    const max = 400_000;
    const input = { id: "fekm18msc2d7awys", title: "ع".repeat(200), contentMd: persian(max) };
    expect(updatePostInput.safeParse(input).success).toBe(true);
    expect(updatePostInput.safeParse({ ...input, contentMd: `${input.contentMd}!` }).success).toBe(
      false,
    );
    expect(bytes([input])).toBeLessThan(ACTION_BODY_LIMIT_BYTES);
  });

  it("a vault item at its maximum size", () => {
    const iv = Buffer.alloc(12, 1).toString("base64");
    const item = { type: "note", ciphertext: "A".repeat(700_000), iv };
    expect(vaultItemInput.safeParse(item).success).toBe(true);
    expect(vaultItemInput.safeParse({ ...item, ciphertext: "A".repeat(700_004) }).success).toBe(
      false,
    );
    expect(bytes([{ id: "fekm18msc2d7awys", ...item }])).toBeLessThan(ACTION_BODY_LIMIT_BYTES);
  });

  it("a CSV import at its maximum length", () => {
    const csv = "2026-10-12,expense,-2900000,Bank,Hosting\n"
      .repeat(30_000)
      .slice(0, MAX_IMPORT_CSV_CHARS);
    expect(importCsvInput.safeParse({ csv }).success).toBe(true);
    expect(importCsvInput.safeParse({ csv: `${csv}x` }).success).toBe(false);
    expect(bytes([{ csv }])).toBeLessThan(ACTION_BODY_LIMIT_BYTES);
  });
});

describe("fitsActionBody", () => {
  it("counts bytes, not characters", () => {
    expect(fitsActionBody("a".repeat(MAX_IMPORT_CSV_CHARS))).toBe(true);
    expect(fitsActionBody("a".repeat(ACTION_BODY_LIMIT_BYTES))).toBe(false);
    // The same number of Persian letters is twice the bytes.
    expect(fitsActionBody("س".repeat(900_000))).toBe(true);
    expect(fitsActionBody("س".repeat(1_100_000))).toBe(false);
  });
});

describe("restoreBatches", () => {
  const item = (chars: number, id = "x") => ({ id, ciphertext: "A".repeat(chars) });

  it("keeps every item, in order, in requests that fit one action", () => {
    const items = [
      ...Array.from({ length: 40 }, (_, i) => item(60_000, `s${i}`)),
      item(700_000, "max"),
      item(700_000, "max2"),
      ...Array.from({ length: 3000 }, (_, i) => item(400, `t${i}`)),
    ];
    const batches = restoreBatches(items);
    expect(batches.flat().map((i) => i.id)).toEqual(items.map((i) => i.id));
    expect(batches.length).toBeGreaterThan(3);
    for (const batch of batches) {
      expect(batch.length).toBeGreaterThan(0);
      expect(
        bytes([{ items: batch.map((b) => ({ ...b, type: "login", iv: "A".repeat(16) })) }]),
      ).toBeLessThan(ACTION_BODY_LIMIT_BYTES);
    }
    expect(RESTORE_BATCH_CHARS).toBeLessThan(ACTION_BODY_LIMIT_BYTES / 2);
  });

  it("sends a small backup in one request and an empty one in none", () => {
    expect(restoreBatches([item(1000), item(2000)])).toHaveLength(1);
    expect(restoreBatches([])).toEqual([]);
  });
});
