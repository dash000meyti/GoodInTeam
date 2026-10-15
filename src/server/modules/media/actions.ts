"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { zBool, zId, zNullString, zOptString } from "@/lib/zod-helpers";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

const fileList = z.preprocess(
  (v) => (Array.isArray(v) ? v : v ? [v] : []),
  z
    .array(z.custom<File>((f) => typeof File !== "undefined" && f instanceof File))
    .min(1)
    .max(20),
);

/** Upload one or more files (FormData: `file` repeated). Duplicates (same sha256) are reused. */
export const uploadMediaAction = defineAction(
  {
    input: z.object({ file: fileList, alt: zNullString(300), isPublic: zBool.optional() }),
    roles: [...ADMIN],
  },
  async ({ file, alt, isPublic }, actor) => {
    const out = [];
    for (const f of file)
      out.push(await svc.uploadMedia(actor, f, { alt, isPublic: isPublic ?? true }));
    refresh();
    return out.map((m) => ({ id: m.id, url: m.url, duplicate: m.duplicate }));
  },
);

export const updateMediaAction = defineAction(
  {
    input: z.object({ id: zId, alt: zNullString(300), isPublic: zBool.optional() }),
    roles: [...ADMIN],
  },
  (input, actor) => {
    svc.updateMedia(actor, input);
    refresh();
    return null;
  },
);

export const deleteMediaAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    svc.deleteMedia(actor, id);
    refresh();
    return null;
  },
);

/** Media picker (post editor): images only. */
export const listMediaAction = defineAction(
  { input: z.object({ q: zOptString(200) }), roles: [...ADMIN], write: false },
  ({ q }, actor) =>
    svc.listMedia(actor, { q, kind: "image", limit: 200 }).map((m) => ({
      id: m.id,
      url: m.url,
      alt: m.alt,
      width: m.width,
      height: m.height,
      name: m.originalName,
    })),
);
