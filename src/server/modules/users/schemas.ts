import { z } from "zod";
import { userRoles } from "@/server/db/schema/auth";
import { zBool, zId, zNullString } from "@/lib/zod-helpers";

/** Email from a form or JSON: trimmed + lower-cased, then validated. */
export const zEmail = z.string().trim().toLowerCase().pipe(z.email().max(200));

/**
 * Image URL: absolute http(s) URL or a site-relative path (`/media/…`).
 * "" → null (clears the field).
 */
export const zImageUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v),
  z
    .union([z.url({ protocol: /^https?$/ }).max(1000), z.string().regex(/^\/[^\s]{0,999}$/)])
    .nullable()
    .optional(),
);

export const localeInput = z.enum(["fa", "en"]);

/** "My account" form. */
export const updateAccountInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: zEmail,
  title: zNullString(120),
  avatarUrl: zImageUrl,
  locale: localeInput,
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1).max(500),
  newPassword: z.string().min(10).max(500),
  confirmPassword: z.string().min(1).max(500),
  /** Sign out every other device after the change (recommended). */
  revokeOtherSessions: zBool.default(true),
});

/** Team roles an admin can hand out from Settings → Team. */
export const staffRoles = ["owner", "admin", "member"] as const;
export const inviteRoles = ["admin", "member"] as const;

export const inviteTeamUserInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: zEmail,
  role: z.enum(inviteRoles).default("member"),
  title: zNullString(120),
  locale: localeInput.default("fa"),
});

export const setUserRoleInput = z.object({ id: zId, role: z.enum(staffRoles) });
export const setUserDisabledInput = z.object({ id: zId, disabled: zBool });
export const userIdInput = z.object({ id: zId });

export const listUsersInput = z.object({
  role: z.enum(userRoles).optional(),
  includeDisabled: z.boolean().default(true),
});
