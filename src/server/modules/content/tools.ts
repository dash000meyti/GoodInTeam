import { revalidateTag } from "next/cache";
import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import { zId } from "@/lib/zod-helpers";
import { postPath } from "@/lib/content";
import { localePath } from "@/i18n/config";
import { env } from "@/lib/env";
import { CONTENT_TAG } from "./queries";
import { listPostsInput, postInput, setStatusInput, updatePostInput } from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

/** Tools run inside route handlers → stale-while-revalidate invalidation. */
const invalidate = () => revalidateTag(CONTENT_TAG, "max");

const url = (p: {
  locale: "fa" | "en";
  type: Parameters<typeof postPath>[0]["type"];
  slug: string;
  seriesSlug?: string | null;
}) => `${env.siteUrl}${localePath(p.locale, postPath(p))}`;

export const contentTools = [
  defineTool({
    name: "content_list_posts",
    title: "List site content",
    description:
      "List CMS posts (articles, tutorials, vlogs, notes, work case studies, services, pages) with status, locale, publish date and views. Filter by type, locale ('fa' | 'en'), status (draft | scheduled | published | archived) or free-text q (title/slug).",
    input: listPostsInput,
    scope: "read",
    roles: [...ADMIN],
    handler: (input, actor) => svc.listPosts(actor, input).map((p) => ({ ...p, url: url(p) })),
  }),
  defineTool({
    name: "content_get_post",
    title: "Get post",
    description:
      "Full post incl. Markdown body (contentMd), SEO fields, type-specific meta (work: client, year, role, stack, metrics…), translations (same translationKey in the other locale) and syndication records.",
    input: z.object({ id: zId }),
    scope: "read",
    roles: [...ADMIN],
    handler: ({ id }, actor) => {
      const r = svc.getPost(actor, id);
      return { ...r, url: url({ ...r.post, seriesSlug: r.seriesSlug }) };
    },
  }),
  defineTool({
    name: "content_create_post",
    title: "Create post",
    description:
      "Create a post. contentMd is Markdown (owner content may include HTML). slug is optional (generated from the title, Persian letters allowed). status defaults to 'draft'; 'published' with a future publishedAt (ISO) becomes 'scheduled'. Start articles with a 2–3 sentence TL;DR in `excerpt` (used for AEO). For type 'work' put client/year/role/stack/metrics in meta.",
    input: postInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => {
      const row = svc.createPost(actor, input);
      invalidate();
      return { id: row.id, slug: row.slug, status: row.status, url: url(row) };
    },
  }),
  defineTool({
    name: "content_update_post",
    title: "Update post",
    description:
      "Partially update a post by id (any field of content_create_post). Changing contentMd recalculates reading time.",
    input: updatePostInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => {
      const row = svc.updatePost(actor, input);
      invalidate();
      return { id: row.id, slug: row.slug, status: row.status, url: url(row) };
    },
  }),
  defineTool({
    name: "content_publish_post",
    title: "Publish / unpublish post",
    description:
      "Change a post's status: 'published' (now, or at publishedAt — future dates schedule it), 'scheduled' (requires publishedAt), 'draft' (unpublish) or 'archived'.",
    input: setStatusInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => {
      const row = svc.setPostStatus(actor, input);
      invalidate();
      return { id: row.id, status: row.status, publishedAt: row.publishedAt, url: url(row) };
    },
  }),
  defineTool({
    name: "content_delete_post",
    title: "Delete post",
    description: "Permanently delete a post (and its syndication records). Cannot be undone.",
    input: z.object({ id: zId }),
    scope: "write",
    roles: [...ADMIN],
    destructive: true,
    handler: ({ id }, actor) => {
      svc.deletePost(actor, id);
      invalidate();
      return { deleted: true };
    },
  }),
];
