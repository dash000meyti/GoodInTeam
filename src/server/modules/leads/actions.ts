"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction, definePublicAction } from "@/server/action";
import { rateLimit } from "@/server/auth/rate-limit";
import { requestMeta } from "@/server/auth/request";
import { AppError } from "@/server/errors";
import { zId } from "@/lib/zod-helpers";
import { contactInput, convertLeadInput, updateLeadStatusInput } from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

/**
 * Public contact form → leads table. Honeypot (`website`) + 5 submissions per
 * 10 minutes per IP. Bots that fill the honeypot get a fake success.
 */
export const submitContactAction = definePublicAction(contactInput, async (input, { locale }) => {
  if (input.website) return { ok: true };
  const { ip, userAgent } = await requestMeta();
  if (!rateLimit(`contact:${ip ?? "unknown"}`, 5, 10 * 60_000).ok) {
    throw new AppError("rate_limited", "Too many submissions");
  }
  svc.createLead(input, { locale, ip, userAgent });
  return { ok: true };
});

export const updateLeadStatusAction = defineAction(
  { input: updateLeadStatusInput, roles: [...ADMIN] },
  (input, actor) => {
    svc.updateLeadStatus(actor, input);
    refresh();
    return null;
  },
);

export const convertLeadAction = defineAction(
  { input: convertLeadInput, roles: [...ADMIN] },
  ({ id }, actor) => {
    const res = svc.convertLeadToClient(actor, id);
    refresh();
    return res;
  },
);

export const deleteLeadAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    svc.deleteLead(actor, id);
    refresh();
    return null;
  },
);
