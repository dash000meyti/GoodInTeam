/**
 * Online, consistent SQLite backup into DATA_DIR/backups (keeps the last 14).
 * Usage: `pnpm backup` — or inside Docker: `docker compose exec app node scripts/backup.mjs`.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dir = path.resolve(process.env.DATA_DIR ?? "./data");
const out = path.join(dir, "backups");
fs.mkdirSync(out, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(out, `app-${stamp}.db`);
const db = new Database(path.join(dir, "app.db"), { readonly: true });
db.backup(target)
  .then(() => {
    db.close();
    const files = fs
      .readdirSync(out)
      .filter((f) => f.startsWith("app-") && f.endsWith(".db"))
      .sort();
    for (const f of files.slice(0, Math.max(0, files.length - 14))) fs.rmSync(path.join(out, f));
    console.log(`✓ backup written to ${target}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
