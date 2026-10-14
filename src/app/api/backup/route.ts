import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { connection } from "next/server";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { toDateInputValue } from "@/lib/tz";
import { logActivity } from "@/server/activity";
import { isOwner } from "@/server/auth/actor";
import { getActor } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appTimezone } from "@/server/modules/settings/service";

/**
 * GET /api/backup — owner-only download of a consistent SQLite snapshot.
 *
 * Uses better-sqlite3's online backup API (safe while the app is serving
 * traffic, WAL included) into a temp file under DATA_DIR/backups, streams it,
 * and removes the temp file (unlinked right after opening on POSIX, so nothing
 * is left behind even if the download is aborted).
 *
 * Session auth only (cookie) — API tokens can't download the database.
 */
export async function GET() {
  await connection();
  const actor = await getActor();
  if (!actor) return Response.json({ error: { code: "unauthorized" } }, { status: 401 });
  if (!isOwner(actor)) return Response.json({ error: { code: "forbidden" } }, { status: 403 });

  const dir = path.join(env.dataDir, "backups");
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.download-${newId()}.db`);
  try {
    await getDb().sqlite.backup(tmp);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    console.error("[backup] failed", err);
    return Response.json(
      { error: { code: "internal", message: "Backup failed" } },
      { status: 500 },
    );
  }

  const size = fs.statSync(tmp).size;
  const fd = fs.openSync(tmp, "r");
  let unlinked = false;
  try {
    fs.unlinkSync(tmp); // POSIX: the open fd keeps the data readable until closed.
    unlinked = true;
  } catch {
    // Windows can't unlink open files — fall back to deleting after the stream closes.
  }
  const stream = fs.createReadStream(tmp, { fd, autoClose: true }); // path ignored when fd is set
  stream.on("close", () => {
    if (!unlinked) fs.rm(tmp, { force: true }, () => {});
  });

  const filename = `goodteam-backup-${toDateInputValue(Date.now(), appTimezone())}.db`;
  logActivity(actor, "backup.download", "backup", null, filename, { bytes: size });

  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
