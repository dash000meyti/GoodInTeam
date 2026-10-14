import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as {
  __goodTeamDb?: { db: DB; sqlite: Database.Database };
};

function open() {
  fs.mkdirSync(env.dataDir, { recursive: true });
  const file = path.join(env.dataDir, "app.db");
  const sqlite = new Database(file);
  // Good defaults for a single-node web app on SQLite.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("cache_size = -20000"); // ~20MB page cache

  const db = drizzle(sqlite, { schema });
  // Apply pending migrations on first connection (idempotent & fast).
  migrate(db, { migrationsFolder: path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
  return { db, sqlite };
}

/** Lazily-opened singleton connection (survives dev hot-reloads). */
export function getDb() {
  if (!globalForDb.__goodTeamDb) globalForDb.__goodTeamDb = open();
  return globalForDb.__goodTeamDb;
}

/**
 * Drizzle instance. Opening is deferred until first use so importing this
 * module during `next build` never touches the filesystem.
 *
 * NOTE (Cache Components): better-sqlite3 is synchronous, so Next.js treats
 * queries as "predictable" and would bake them into the static shell at build
 * time. Request-time reads MUST happen after `await connection()` / cookies()
 * or inside a `'use cache'` function that is itself reached at request time.
 * See docs/architecture.md → "Rendering & data".
 */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb().db as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export { schema };
