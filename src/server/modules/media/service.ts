import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/server/db/client";
import { media, type Media } from "@/server/db/schema";
import { assertAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, notFound } from "@/server/errors";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { imageSize } from "./image-size";
import { MAX_UPLOAD_BYTES, mediaKinds, mediaUrl, safeFileName, sniffMime } from "./storage";

/**
 * Uploaded files live OUTSIDE the web root in `${DATA_DIR}/uploads/<id>-<name>`
 * and are served by src/app/media/[id]/[name]/route.ts.
 */
export const uploadsDir = () => path.join(env.dataDir, "uploads");
export const diskPath = (m: Pick<Media, "id" | "fileName">) =>
  path.join(uploadsDir(), `${m.id}-${m.fileName}`);

export type MediaItem = Media & { url: string; kind: "image" | "pdf" | "video" };

const withUrl = (m: Media): MediaItem => ({
  ...m,
  url: mediaUrl(m),
  kind: mediaKinds[m.mime as keyof typeof mediaKinds]?.kind ?? "image",
});

export async function uploadMedia(
  actor: Actor,
  file: File,
  opts: { alt?: string | null; isPublic?: boolean } = {},
): Promise<MediaItem & { duplicate: boolean }> {
  assertAdmin(actor);
  if (file.size === 0) throw new AppError("validation", "Empty file", { file: ["empty"] });
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("validation", "File too large (max 20 MB)", { file: ["too_large"] });
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(buf.subarray(0, 512), file.name);
  if (!mime) throw new AppError("validation", "Unsupported file type", { file: ["type"] });

  const sha256 = createHash("sha256").update(buf).digest("hex");
  const existing = db.select().from(media).where(eq(media.sha256, sha256)).get();
  if (existing && fs.existsSync(diskPath(existing)))
    return { ...withUrl(existing), duplicate: true };

  const size = mediaKinds[mime].kind === "image" ? imageSize(buf) : null;
  const id = newId();
  const fileName = safeFileName(file.name, mime);
  fs.mkdirSync(uploadsDir(), { recursive: true });
  const target = diskPath({ id, fileName });
  const tmp = `${target}.part`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, target);

  const row = db
    .insert(media)
    .values({
      id,
      fileName,
      originalName: file.name.slice(0, 200),
      mime,
      size: buf.byteLength,
      width: size?.width ?? null,
      height: size?.height ?? null,
      alt: opts.alt ?? null,
      sha256,
      isPublic: opts.isPublic ?? true,
      uploadedBy: actor.user.id,
    })
    .returning()
    .get();
  logActivity(actor, "media.upload", "media", row.id, row.originalName);
  return { ...withUrl(row), duplicate: false };
}

export function listMedia(
  actor: Actor,
  input: { q?: string; kind?: "image" | "pdf" | "video"; limit?: number } = {},
) {
  assertAdmin(actor);
  const mimes = input.kind
    ? Object.entries(mediaKinds)
        .filter(([, v]) => v.kind === input.kind)
        .map(([k]) => k)
    : null;
  return db
    .select()
    .from(media)
    .where(
      and(
        input.q
          ? or(like(media.originalName, `%${input.q}%`), like(media.alt, `%${input.q}%`))
          : undefined,
        mimes ? or(...mimes.map((m) => eq(media.mime, m))) : undefined,
      ),
    )
    .orderBy(desc(media.createdAt))
    .limit(input.limit ?? 500)
    .all()
    .map(withUrl);
}

export function updateMedia(
  actor: Actor,
  input: { id: string; alt?: string | null; isPublic?: boolean },
) {
  assertAdmin(actor);
  const row = db
    .update(media)
    .set({
      ...(input.alt !== undefined && { alt: input.alt }),
      ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
    })
    .where(eq(media.id, input.id))
    .returning()
    .get();
  if (!row) throw notFound("Media");
  return withUrl(row);
}

export function deleteMedia(actor: Actor, id: string) {
  assertAdmin(actor);
  const row = db.select().from(media).where(eq(media.id, id)).get();
  if (!row) throw notFound("Media");
  db.delete(media).where(eq(media.id, id)).run();
  try {
    fs.rmSync(diskPath(row), { force: true });
  } catch (err) {
    console.error("[media] failed to remove file", err);
  }
  logActivity(actor, "media.delete", "media", id, row.originalName);
}

/** For the /media route: the row (no auth here — the route checks isPublic / session). */
export function findMedia(id: string) {
  return db.select().from(media).where(eq(media.id, id)).get() ?? null;
}
