import fs from "node:fs";
import { Readable } from "node:stream";
import { connection, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { diskPath, findMedia } from "@/server/modules/media/service";

/**
 * Serves uploaded files from ${DATA_DIR}/uploads (outside the web root).
 * - content type from the DB row (sniffed at upload), `nosniff`
 * - SVG gets `Content-Security-Policy: sandbox` (scripts can't run)
 * - long immutable caching (ids never change content); private files need a
 *   session and are never cached by shared caches
 * - single-range requests (video seeking)
 */
const notFound = () =>
  new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });

export async function GET(req: NextRequest, ctx: RouteContext<"/media/[id]/[name]">) {
  await connection();
  const { id, name } = await ctx.params;
  if (!/^[0-9a-z]{8,32}$/.test(id)) return notFound();
  const row = findMedia(id);
  if (!row || row.fileName !== decodeURIComponent(name)) return notFound();
  if (!row.isPublic && !(await getSessionUser())) return notFound();

  const file = diskPath(row);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return notFound();
  }

  const etag = `"${row.sha256.slice(0, 32)}"`;
  const headers = new Headers({
    "Content-Type": row.mime,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": row.isPublic ? "public, max-age=31536000, immutable" : "private, max-age=3600",
    ETag: etag,
    "Accept-Ranges": "bytes",
    "Content-Disposition": `${row.mime === "application/pdf" || row.mime.startsWith("image/") || row.mime.startsWith("video/") ? "inline" : "attachment"}; filename="${row.fileName}"`,
  });
  if (row.mime === "image/svg+xml")
    headers.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    );
  if (req.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });

  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
    start = Math.max(0, start);
    end = Math.min(stat.size - 1, end);
    if (start > end) {
      headers.set("Content-Range", `bytes */${stat.size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }
  headers.set("Content-Length", String(stat.size));
  const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers });
}
