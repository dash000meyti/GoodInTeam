/** DANGER: deletes the local database (dev only). `pnpm db:reset` then `pnpm db:seed`. */
import fs from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to reset the database in production.");
  process.exit(1);
}
const dir = path.resolve(process.env.DATA_DIR ?? "./data");
for (const f of ["app.db", "app.db-wal", "app.db-shm"])
  fs.rmSync(path.join(dir, f), { force: true });
console.log(`✓ removed database in ${dir}`);
