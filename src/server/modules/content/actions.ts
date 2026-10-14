"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { defineAction, definePublicAction } from "@/server/action";
import { rateLimit } from "@/server/auth/rate-limit";
import { requestMeta } from "@/server/auth/request";
import { zId } from "@/lib/zod-helpers";
import { CONTENT_TAG } from "./queries";
import {
  checkSlugInput,
  postInput,
  seriesInput,
  setStatusInput,
  syndicationInput,
  testimonialInput,
  updatePostInput,
  updateSeriesInput,
  updateTestimonialInput,
} from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

/** Public content changed: purge cached public pages (read-your-own-writes) + panel data. */
function invalidate() {
  updateTag(CONTENT_TAG);
  refresh();
}

export const createPostAction = defineAction(
  { input: postInput, roles: [...ADMIN] },
  (input, actor) => {
    const row = svc.createPost(actor, input);
    invalidate();
    return { id: row.id, slug: row.slug, status: row.status };
  },
);

export const updatePostAction = defineAction(
  { input: updatePostInput, roles: [...ADMIN] },
  (input, actor) => {
    const row = svc.updatePost(actor, input);
    invalidate();
    return { id: row.id, slug: row.slug, status: row.status };
  },
);

export const setPostStatusAction = defineAction(
  { input: setStatusInput, roles: [...ADMIN] },
  (input, actor) => {
    const row = svc.setPostStatus(actor, input);
    invalidate();
    return { id: row.id, status: row.status };
  },
);

export const deletePostAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    svc.deletePost(actor, id);
    invalidate();
    return null;
  },
);

export const createTranslationAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    const row = svc.createTranslation(actor, id);
    refresh();
    return { id: row.id };
  },
);

export const checkSlugAction = defineAction(
  { input: checkSlugInput, roles: [...ADMIN], write: false },
  (input, actor) => svc.checkSlug(actor, input),
);

export const upsertSyndicationAction = defineAction(
  { input: syndicationInput, roles: [...ADMIN] },
  (input, actor) => {
    const row = svc.upsertSyndication(actor, input);
    invalidate();
    return row ? { id: row.id } : null;
  },
);

export const createSeriesAction = defineAction(
  { input: seriesInput, roles: [...ADMIN] },
  (input, actor) => {
    const row = svc.createSeries(actor, input);
    invalidate();
    return { id: row.id };
  },
);

export const updateSeriesAction = defineAction(
  { input: updateSeriesInput, roles: [...ADMIN] },
  (input, actor) => {
    svc.updateSeries(actor, input);
    invalidate();
    return null;
  },
);

export const deleteSeriesAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    svc.deleteSeries(actor, id);
    invalidate();
    return null;
  },
);

export const createTestimonialAction = defineAction(
  { input: testimonialInput, roles: [...ADMIN] },
  (input, actor) => {
    const row = svc.createTestimonial(actor, input);
    invalidate();
    return { id: row.id };
  },
);

export const updateTestimonialAction = defineAction(
  { input: updateTestimonialInput, roles: [...ADMIN] },
  (input, actor) => {
    svc.updateTestimonial(actor, input);
    invalidate();
    return null;
  },
);

export const deleteTestimonialAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    svc.deleteTestimonial(actor, id);
    invalidate();
    return null;
  },
);

/**
 * Public view counter, fired once per page view by a client island after
 * load. Rate-limited per IP+post; does NOT purge the content cache (view
 * counts in public lists may lag by the cache lifetime, by design).
 */
export const recordViewAction = definePublicAction(z.object({ id: zId }), async ({ id }) => {
  const { ip } = await requestMeta();
  if (!rateLimit(`view:${ip ?? "?"}:${id}`, 1, 30 * 60_000).ok) return null;
  svc.recordView(id);
  return null;
});
