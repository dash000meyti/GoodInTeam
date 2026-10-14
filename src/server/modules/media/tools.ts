import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import { zOptString } from "@/lib/zod-helpers";
import { env } from "@/lib/env";
import * as svc from "./service";

export const mediaTools = [
  defineTool({
    name: "media_list",
    title: "List media",
    description:
      "Uploaded files (images, PDFs, MP4 videos) with absolute URL, MIME type, size in bytes, pixel width/height and alt text. Use the URL as a post cover (coverUrl) or inside Markdown. Filter by kind or free-text q (file name / alt).",
    input: z.object({
      q: zOptString(200),
      kind: z.enum(["image", "pdf", "video"]).optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
    }),
    scope: "read",
    roles: ["owner", "admin"],
    handler: (input, actor) =>
      svc.listMedia(actor, input).map((m) => ({
        id: m.id,
        url: `${env.siteUrl}${m.url}`,
        path: m.url,
        name: m.originalName,
        mime: m.mime,
        kind: m.kind,
        size: m.size,
        width: m.width,
        height: m.height,
        alt: m.alt,
        isPublic: m.isPublic,
        createdAt: m.createdAt,
      })),
  }),
];
