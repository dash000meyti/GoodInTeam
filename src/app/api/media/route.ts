import { connection } from "next/server";
import { isLocale } from "@/i18n/config";
import { toActionError, type ActionResult } from "@/server/action";
import { isAdmin } from "@/server/auth/actor";
import { getActor } from "@/server/auth/session";
import { AppError, httpStatus } from "@/server/errors";
import { uploadMedia } from "@/server/modules/media/service";
import { MAX_UPLOAD_BYTES } from "@/server/modules/media/storage";

/**
 * POST /api/media?locale=fa|en — upload ONE file to the media library
 * (multipart form: `file`, optional `alt`, `isPublic`). `locale` is the
 * language of error messages.
 *
 * Uploads are the only request that needs a large body, so they have their own
 * endpoint with their own limit instead of raising the limit of every server
 * action (next.config.ts). The panel's uploader sends one request per file.
 *
 * - Session auth only (cookie), owner/admin, like the other cookie route
 *   handlers; API tokens cannot upload.
 * - Same-origin only: a route handler has no built-in origin check, so the
 *   `Origin` header must name this host (the rule Next.js applies to actions).
 * - The body is read as a stream and refused as soon as it passes the limit.
 * - The file itself goes through the same service as before: the type comes
 *   from its magic bytes, never from the browser.
 *
 * Answers with the `ActionResult` shape the uploader already understands.
 */
type Uploaded = { id: string; url: string; duplicate: boolean };

/** One file plus the multipart framing and the small text fields. */
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

const tooLarge = () =>
  new AppError("validation", "File too large (max 20 MB)", { file: ["too_large"] });

function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0]!
    .trim();
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || !host || originHost !== host) {
    throw new AppError("forbidden", "Cross-origin upload refused");
  }
}

/** The whole body, unless it is larger than `limit` bytes. */
async function readLimited(req: Request, limit: number) {
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > limit) throw tooLarge();
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function POST(req: Request) {
  await connection();
  const wanted = new URL(req.url).searchParams.get("locale");
  const locale = isLocale(wanted) ? wanted : "fa";
  let result: ActionResult<Uploaded[]>;
  try {
    assertSameOrigin(req);
    const actor = await getActor();
    if (!actor) throw new AppError("unauthorized", "Not signed in");
    if (!isAdmin(actor)) throw new AppError("forbidden", "Forbidden");

    const type = req.headers.get("content-type") ?? "";
    if (!type.toLowerCase().startsWith("multipart/form-data")) {
      throw new AppError("validation", "Expected a multipart form");
    }
    const body = await readLimited(req, MAX_BODY_BYTES);
    let form: FormData;
    try {
      form = await new Response(body, { headers: { "content-type": type } }).formData();
    } catch {
      throw new AppError("validation", "Malformed upload");
    }
    const files = form.getAll("file");
    const file = files[0];
    if (files.length !== 1 || !(file instanceof File)) {
      throw new AppError("validation", "Send exactly one file", { file: ["required"] });
    }
    const alt = form.get("alt");
    const isPublic = form.get("isPublic");
    const saved = await uploadMedia(actor, file, {
      alt: typeof alt === "string" && alt.trim() ? alt.trim().slice(0, 300) : null,
      isPublic: isPublic === null ? true : isPublic === "true" || isPublic === "on",
    });
    result = { ok: true, data: [{ id: saved.id, url: saved.url, duplicate: saved.duplicate }] };
  } catch (err) {
    result = toActionError(err, locale);
  }
  return Response.json(result, {
    status: result.ok ? 200 : httpStatus[result.error.code],
    headers: { "Cache-Control": "no-store" },
  });
}
