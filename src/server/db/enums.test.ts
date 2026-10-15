import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as enums from "./enums";
import * as schema from "./schema";

const SRC = path.resolve(import.meta.dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

/** `import { a } from "@/server/db/schema…"` that is not `import type …`. */
const VALUE_SCHEMA_IMPORT = /^import\s+(?!type\b)[^;]*?from\s+["']@\/server\/db\/schema[^"']*["']/m;

describe("db enums", () => {
  it("has no imports (stays safe for client bundles)", () => {
    const src = fs.readFileSync(path.join(import.meta.dirname, "enums.ts"), "utf8");
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/\brequire\(/);
  });

  it("is re-exported unchanged by the schema", () => {
    for (const [name, value] of Object.entries(enums)) {
      expect(schema[name as keyof typeof schema], name).toBe(value);
    }
  });

  it("client modules never import values from the drizzle schema", () => {
    const offenders = walk(SRC).filter((file) => {
      const src = fs.readFileSync(file, "utf8");
      const isClient = /^\s*["']use client["']/m.test(src.slice(0, 200));
      const inClientSafeDir = /[/\\]src[/\\](components|lib|i18n)[/\\]/.test(file);
      return (isClient || inClientSafeDir) && VALUE_SCHEMA_IMPORT.test(src);
    });
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
