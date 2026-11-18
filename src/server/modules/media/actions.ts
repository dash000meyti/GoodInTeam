"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { zBool, zId, zNullString, zOptString } from "@/lib/zod-helpers";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

// Uploading is NOT an action: files go to `POST /api/media`
// (src/app/api/media/route.ts), which has its own body limit. No server action
// takes a `File`; they all share the small limit in next.config.ts.

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
