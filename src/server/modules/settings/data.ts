import "server-only";
import fs from "node:fs";
import path from "node:path";
import { count, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db, getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { isOwner, type Actor } from "@/server/auth/actor";
import { forbidden } from "@/server/errors";
import { env } from "@/lib/env";

/** Main tables shown on Settings → Data, grouped for readability. */
const TABLES: { group: string; name: string; table: SQLiteTable }[] = [
  { group: "people", name: "users", table: s.users },
  { group: "people", name: "sessions", table: s.sessions },
  { group: "people", name: "api_tokens", table: s.apiTokens },
  { group: "people", name: "clients", table: s.clients },
  { group: "work", name: "projects", table: s.projects },
  { group: "work", name: "milestones", table: s.milestones },
  { group: "work", name: "project_updates", table: s.projectUpdates },
  { group: "work", name: "tasks", table: s.tasks },
  { group: "work", name: "time_entries", table: s.timeEntries },
  { group: "work", name: "events", table: s.events },
  { group: "money", name: "transactions", table: s.transactions },
  { group: "money", name: "invoices", table: s.invoices },
  { group: "money", name: "contracts", table: s.contracts },
  { group: "knowledge", name: "docs", table: s.docs },
  { group: "knowledge", name: "vault_items", table: s.vaultItems },
  { group: "site", name: "posts", table: s.posts },
  { group: "site", name: "media", table: s.media },
  { group: "site", name: "leads", table: s.leads },
  { group: "system", name: "notifications", table: s.notifications },
  { group: "system", name: "activity_log", table: s.activityLog },
  { group: "system", name: "settings", table: s.settings },
];

function fileSize(file: string) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

/** Size + count of files under a directory (bounded walk). */
function dirStats(dir: string, limit = 20_000) {
  let files = 0;
  let bytes = 0;
  const stack = [dir];
  while (stack.length && files < limit) {
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(current, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) {
        files++;
        bytes += fileSize(p);
      }
    }
  }
  return { files, bytes };
}

/** Owner-only: database file sizes, row counts and server-side backups. */
export function databaseStats(actor: Actor) {
  if (!isOwner(actor)) throw forbidden();
  const dataDir = env.dataDir;
  const dbFile = path.join(dataDir, "app.db");
  const { sqlite } = getDb();

  const tables = TABLES.map(({ group, name, table }) => ({
    group,
    name,
    rows: db.select({ n: count() }).from(table).get()?.n ?? 0,
  }));

  const backupsDir = path.join(dataDir, "backups");
  let backups: { name: string; bytes: number; createdAt: Date }[] = [];
  try {
    backups = fs
      .readdirSync(backupsDir)
      .filter((f) => f.endsWith(".db") && !f.startsWith("."))
      .map((f) => {
        const st = fs.statSync(path.join(backupsDir, f));
        return { name: f, bytes: st.size, createdAt: st.mtime };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch {
    backups = [];
  }

  return {
    dataDir,
    dbFile,
    files: {
      db: fileSize(dbFile),
      wal: fileSize(`${dbFile}-wal`),
      shm: fileSize(`${dbFile}-shm`),
    },
    sqlite: {
      version: db.get<{ v: string }>(sql`select sqlite_version() as v`)?.v ?? "?",
      journalMode: String(sqlite.pragma("journal_mode", { simple: true })),
      pageSize: Number(sqlite.pragma("page_size", { simple: true })),
      pageCount: Number(sqlite.pragma("page_count", { simple: true })),
      freePages: Number(sqlite.pragma("freelist_count", { simple: true })),
    },
    tables,
    totalRows: tables.reduce((sum, t) => sum + t.rows, 0),
    uploads: dirStats(path.join(dataDir, "uploads")),
    backups: { dir: backupsDir, count: backups.length, latest: backups.slice(0, 5) },
  };
}
