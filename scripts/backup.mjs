// Production backup (plain JS, runs inside the container):
//   docker compose exec app node scripts/backup.mjs
// Writes a consistent online copy to $DATA_DIR/backups and keeps the last 14.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dir = path.resolve(process.env.DATA_DIR ?? "./data");
const out = path.join(dir, "backups");
fs.mkdirSync(out, { recursive: true });
const target = path.join(out, `app-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
const db = new Database(path.join(dir, "app.db"), { readonly: true });
await db.backup(target);
db.close();
const files = fs
  .readdirSync(out)
  .filter((f) => f.startsWith("app-") && f.endsWith(".db"))
  .sort();
for (const f of files.slice(0, Math.max(0, files.length - 14))) fs.rmSync(path.join(out, f));
console.log(`backup written to ${target}`);
