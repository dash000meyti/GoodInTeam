import type { ApiTokenScope, UserRole } from "@/server/db/schema";
import { AppError, forbidden } from "@/server/errors";

/** The authenticated user, as exposed to app code (never includes secrets). */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId: string | null;
  locale: "fa" | "en";
  avatarUrl: string | null;
  title: string | null;
}

/**
 * "Who is doing this?" — passed as the first argument to every service
 * function. Comes from a browser session, an API token, or the MCP endpoint.
 */
export interface Actor {
  via: "session" | "api" | "system";
  user: SessionUser;
  /** API scopes. Sessions always have full scopes for their role. */
  scopes: readonly ApiTokenScope[];
}

export const isStaff = (a: Actor) => a.user.role !== "client";
export const isAdmin = (a: Actor) => a.user.role === "owner" || a.user.role === "admin";
export const isOwner = (a: Actor) => a.user.role === "owner";

export function assertStaff(a: Actor) {
  if (!isStaff(a)) throw forbidden();
}
export function assertAdmin(a: Actor) {
  if (!isAdmin(a)) throw forbidden();
}
export function assertWrite(a: Actor) {
  if (!a.scopes.includes("write") && !a.scopes.includes("admin")) {
    throw new AppError("forbidden", "This token is read-only");
  }
}
