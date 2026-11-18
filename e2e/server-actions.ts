/**
 * Helpers for specs that talk to the server the way a client of the server
 * actions does, without a browser: they read the server references of the
 * build under test and post to them.
 *
 * The build must be the one the server at BASE_URL runs (`pnpm build` in this
 * checkout, then `pnpm start`; CI does exactly that). Against `pnpm dev` there
 * is no manifest and the specs that need one skip themselves.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { APIRequestContext, APIResponse } from "@playwright/test";

export interface ServerReference {
  id: string;
  /** Exported name; a `'use cache'` function is `$$RSC_SERVER_CACHE_<n>`. */
  name: string;
  file: string;
  cached: boolean;
}

const MANIFEST = path.join(process.cwd(), ".next", "server", "server-reference-manifest.json");

/** Every server reference of the build (actions and cached functions), or null without a build. */
export function builtReferences(): ServerReference[] | null {
  if (!existsSync(MANIFEST)) return null;
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    node: Record<string, { exportedName: string; filename: string }>;
  };
  return Object.entries(manifest.node).map(([id, entry]) => ({
    id,
    name: entry.exportedName,
    file: entry.filename,
    cached: entry.exportedName.startsWith("$$RSC_SERVER_CACHE_"),
  }));
}

/** The id of an exported server action, e.g. `actionId("login", "auth/actions")`. */
export function actionId(name: string, fileHint: string) {
  const found = (builtReferences() ?? []).find((r) => r.name === name && r.file.includes(fileHint));
  if (!found) throw new Error(`Server action ${name} (${fileHint}) is not in the build`);
  return found.id;
}

export interface ActionReply {
  status: number;
  response: APIResponse;
  body: string;
  /** The `ActionResult` in the reply, when there is one. */
  result: { ok: boolean; data?: unknown; error?: { code: string; message: string } } | null;
  /** Target of a redirect the action asked for (e.g. after signing in). */
  redirect: string | null;
}

/** POST a server reference the way the client runtime does. */
export async function callAction(
  request: APIRequestContext,
  pagePath: string,
  id: string,
  args: unknown[],
  headers: Record<string, string> = {},
): Promise<ActionReply> {
  const response = await request.post(pagePath, {
    headers: {
      "Next-Action": id,
      Accept: "text/x-component",
      "Content-Type": "text/plain;charset=UTF-8",
      ...headers,
    },
    data: JSON.stringify(args),
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  const body = await response.text();
  let result: ActionReply["result"] = null;
  for (const line of body.split("\n")) {
    const row = /^[0-9a-f]+:(\{"ok":(?:true|false).*)$/.exec(line);
    if (!row) continue;
    try {
      result = JSON.parse(row[1]!) as ActionReply["result"];
      break;
    } catch {
      // Not the result row.
    }
  }
  const redirect = response.headers()["x-action-redirect"] ?? null;
  return { status: response.status(), response, body, result, redirect };
}

export const DEMO_PASSWORD = "goodteam-demo-pass";
export const OWNER = "owner@goodteam.local";
export const MEMBER = "sara@goodteam.local";

/** Sign in through the real sign-in action; the session cookie stays in `request`. */
export async function signIn(request: APIRequestContext, email: string) {
  const reply = await callAction(request, "/en/login", actionId("login", "auth/actions"), [
    { email, password: DEMO_PASSWORD },
  ]);
  if (!reply.redirect) throw new Error(`Sign-in as ${email} failed: ${reply.body.slice(0, 200)}`);
  return reply;
}

/** True when the request context holds a session cookie. */
export async function hasSession(request: APIRequestContext) {
  const state = await request.storageState();
  return state.cookies.some((c) => c.name === "gt_session");
}
