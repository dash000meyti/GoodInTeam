"use server";

import { refresh } from "next/cache";
import { definePublicAction } from "@/server/action";
import { getActor } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { requestMeta } from "@/server/auth/request";
import { AppError } from "@/server/errors";
import { declineContractInput, signContractInput, viewContractInput } from "./schemas";
import * as svc from "./service";

/**
 * Unauthenticated actions used by the public signing page (/sign/<token>).
 * The token is the only credential; every call is rate limited per IP.
 * Staff sessions (owner previewing the link) never record views or sign.
 */
const SIGN_LIMIT = 10;
const SIGN_WINDOW = 10 * 60 * 1000;

async function isStaffPreview() {
  const actor = await getActor();
  return !!actor && actor.user.role !== "client";
}

/** Called once on mount by the page (never during render). */
export const recordContractViewAction = definePublicAction(viewContractInput, async ({ token }) => {
  const req = await requestMeta();
  if (!rateLimit(`contract-view:${req.ip ?? "unknown"}`, 60, SIGN_WINDOW).ok) {
    return { recorded: false };
  }
  if (await isStaffPreview()) return { recorded: false };
  return svc.recordContractView(token, req);
});

export const signContractAction = definePublicAction(signContractInput, async (input) => {
  const req = await requestMeta();
  if (!rateLimit(`contract-sign:${req.ip ?? "unknown"}`, SIGN_LIMIT, SIGN_WINDOW).ok) {
    throw new AppError("rate_limited", "Too many attempts");
  }
  if (await isStaffPreview()) throw new AppError("forbidden", "Preview only");
  const res = svc.signContractPublic(input, req);
  if (res.outcome === "signed") refresh();
  return res;
});

export const declineContractAction = definePublicAction(declineContractInput, async (input) => {
  const req = await requestMeta();
  if (!rateLimit(`contract-sign:${req.ip ?? "unknown"}`, SIGN_LIMIT, SIGN_WINDOW).ok) {
    throw new AppError("rate_limited", "Too many attempts");
  }
  if (await isStaffPreview()) throw new AppError("forbidden", "Preview only");
  const res = svc.declineContractPublic(input, req);
  if (res.outcome === "declined") refresh();
  return res;
});
