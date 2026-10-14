"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { localePath } from "@/i18n/config";
import { defineAction, definePublicAction } from "@/server/action";
import { logActivity } from "@/server/activity";
import { verifyPassword } from "@/server/auth/password";
import { rateLimit } from "@/server/auth/rate-limit";
import { requestMeta } from "@/server/auth/request";
import { createSession, destroySession, getActor } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { localized } from "@/server/modules/users/localize";
import { changePasswordInput } from "@/server/modules/users/schemas";
import {
  changePassword,
  createUser,
  findUserByEmail,
  hasOwner,
} from "@/server/modules/users/service";
import { loginInput, sessionHandleInput, setupInput } from "./schemas";
import { currentSessionId, revokeOtherSessions, revokeSession } from "./sessions";

/** Only allow same-site relative redirects (prevents open-redirects). */
function safeNext(next: string | undefined, fallback: string) {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\"))
    return next;
  return fallback;
}

export const login = definePublicAction(loginInput, async (input, { locale }) => {
  const meta = await requestMeta();
  const email = input.email.trim().toLowerCase();
  const byIp = rateLimit(`login:ip:${meta.ip ?? "unknown"}`, 20, 15 * 60_000);
  const byEmail = rateLimit(`login:email:${email}`, 8, 15 * 60_000);
  if (!byIp.ok || !byEmail.ok) throw new AppError("rate_limited", "Too many attempts");

  const user = findUserByEmail(email);
  const ok = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !ok || user.disabled) {
    throw new AppError(
      "validation",
      locale === "fa" ? "ایمیل یا رمز عبور اشتباه است." : "Invalid email or password.",
    );
  }
  await createSession(user.id, meta);
  logActivity(
    { via: "session", scopes: [], user: { ...user, locale: user.locale } },
    "auth.login",
    "user",
    user.id,
    undefined,
    { ip: meta.ip },
  );
  redirect(safeNext(input.next, localePath(user.locale, "/panel")));
});

export const setupOwner = definePublicAction(setupInput, async (input, { locale }) => {
  if (hasOwner()) throw new AppError("forbidden", "Setup already completed");
  const meta = await requestMeta();
  const user = await createUser({ ...input, role: "owner", locale });
  await createSession(user.id, meta);
  redirect(localePath(locale, "/panel"));
});

export async function logout() {
  const actor = await getActor();
  await destroySession();
  if (actor) logActivity(actor, "auth.logout", "user", actor.user.id);
  redirect(localePath(actor?.user.locale ?? "fa", "/login"));
}

/** Settings → My account → change password (session only; never via API). */
export const changePasswordAction = defineAction({ input: changePasswordInput }, (input, actor) =>
  localized(async () => {
    const res = await changePassword(actor, input, { keepSessionId: await currentSessionId() });
    refresh();
    return res;
  }),
);

export const revokeSessionAction = defineAction(
  { input: sessionHandleInput },
  async ({ id }, actor) => {
    revokeSession(actor, id, await currentSessionId());
    refresh();
    return null;
  },
);

export const revokeOtherSessionsAction = defineAction(
  { input: z.object({}) },
  async (_input, actor) => {
    const n = revokeOtherSessions(actor, await currentSessionId());
    refresh();
    return { revoked: n };
  },
);
