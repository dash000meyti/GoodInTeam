/**
 * The sign-in throttle counts by the address the proxy vetted, whatever
 * address a request claims.
 *
 * This file sorts LAST on purpose (the suite runs its files in order, one
 * worker): its second test spends 8 of the 20 failed sign-ins one address may
 * make in 15 minutes (server/modules/auth/login-throttle.ts), and nothing
 * after it needs to sign in. It uses an address that does not exist, so no
 * account is locked. Running it more than twice within 15 minutes against the
 * same server uses the budget up: restart the server (the limiter is in memory).
 *
 * Needs the production build of this checkout behind BASE_URL (see security.spec.ts).
 */
import { expect, test } from "@playwright/test";
import { actionId, builtReferences, callAction, hasSession } from "./server-actions";

test.skip(
  !builtReferences(),
  "needs the production build of this checkout (.next) behind BASE_URL",
);

const rand = Math.random().toString(36).slice(2, 10);
const forged = (ip: string) => ({ "X-Forwarded-For": ip, "X-Real-IP": ip, "CF-Connecting-IP": ip });

test("no sign-in attempt is evaluated outside the throttle", async ({ request }) => {
  const login = actionId("login", "auth/actions");
  // A fresh claimed address per attempt, on the paths that are files or Next's
  // own: none of these may even reach the password check.
  let attempt = 0;
  for (const prefix of ["/brand", "/fonts", "/media", "/_next", "/_next/static", "/api"]) {
    for (let i = 0; i < 4; i++) {
      const reply = await callAction(
        request,
        `${prefix}/login`,
        login,
        [{ email: `nobody-${rand}@example.test`, password: `wrong-${attempt}` }],
        forged(`198.51.100.${++attempt}`),
      );
      // "validation" is the answer of an evaluated wrong password.
      expect(reply.result?.error?.code, `${prefix} attempt ${i}`).not.toBe("validation");
      expect(reply.result?.ok ?? false, prefix).toBe(false);
    }
  }
  expect(await hasSession(request)).toBe(false);
});

test("the sign-in throttle holds under rotating forged addresses", async ({ request }) => {
  // The check does not depend on the browser, and the budget it spends is
  // shared by every project of a `BROWSERS=all` run: once per run is enough.
  test.skip(test.info().project.name !== "chromium", "runs once per run (chromium)");
  const login = actionId("login", "auth/actions");
  const email = `nobody-${rand}@example.test`;
  const codes: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const reply = await callAction(
      request,
      "/en/login",
      login,
      [{ email, password: `wrong-password-${i}` }],
      forged(`203.0.113.${100 + i}`),
    );
    codes.push(reply.result?.error?.code ?? `status ${reply.status}`);
  }
  // Eight failures per (email, address) are allowed, then the address is told
  // to wait: every request counted against the same, real address. (When
  // earlier runs already used part of the per-address budget, the limit
  // arrives sooner; it never arrives later.)
  const firstLimited = codes.indexOf("rate_limited");
  expect(firstLimited, codes.join(" ")).toBeGreaterThanOrEqual(0);
  expect(firstLimited, codes.join(" ")).toBeLessThanOrEqual(8);
  expect(
    codes.slice(0, firstLimited).every((c) => c === "validation"),
    codes.join(" "),
  ).toBe(true);
  expect(
    codes.slice(firstLimited).every((c) => c === "rate_limited"),
    codes.join(" "),
  ).toBe(true);
});
