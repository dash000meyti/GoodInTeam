/**
 * The gate every server action passes: the proxy's voucher, then the shared
 * budget for callers without a session. Also the FormData → object step.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Actor } from "./auth/actor";

vi.mock("server-only", () => ({}));

let requestHeaders = new Headers();
let actor: Actor | null = null;
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));
vi.mock("./auth/session", () => ({ getActor: async () => actor }));

const { ANON_ACTION_LIMIT, defineAction, definePublicAction, formDataToObject } =
  await import("./action");
const { clearRateLimits } = await import("./auth/rate-limit");
const { vouchedHeaders } = await import("./auth/edge-testing");
const { EDGE_HEADER } = await import("./auth/edge");

const member: Actor = {
  via: "session",
  scopes: ["read", "write", "admin"],
  user: {
    id: "u1",
    email: "m@x.test",
    name: "M",
    role: "member",
    clientId: null,
    locale: "en",
    avatarUrl: null,
    title: null,
  },
};

const ran = vi.fn();
const privateAction = defineAction({ input: z.object({ n: z.number() }) }, ({ n }) => {
  ran();
  return n + 1;
});
const publicAction = definePublicAction(z.object({ n: z.number() }), ({ n }) => {
  ran();
  return n + 1;
});

/** A page request as the proxy passes it on: vouched for, with the locale it routed to. */
const pageRequest = (ip: string) => vouchedHeaders({ "x-forwarded-for": ip, "x-gt-locale": "en" });

beforeEach(() => {
  clearRateLimits();
  vi.stubEnv("TRUST_PROXY", "xff:1");
  ran.mockClear();
  actor = null;
  requestHeaders = pageRequest("198.51.100.1");
});

describe("actions require the proxy's voucher", () => {
  it.each([
    ["no voucher", new Headers({ "x-forwarded-for": "203.0.113.9", "x-gt-locale": "en" })],
    [
      "a forged voucher",
      new Headers({ [EDGE_HEADER]: "1", "x-forwarded-for": "203.0.113.9", "x-gt-locale": "en" }),
    ],
    // Vouched for, but not routed as a page (an API path, an unknown prefix).
    ["no locale from the proxy", vouchedHeaders({ "x-forwarded-for": "203.0.113.9" })],
    ["an unknown locale", vouchedHeaders({ "x-gt-locale": "api" })],
  ])("refuses a request with %s before running anything", async (_label, headers) => {
    requestHeaders = headers;
    actor = member;
    expect(await privateAction({ n: 1 })).toMatchObject({
      ok: false,
      error: { code: "forbidden" },
    });
    expect(await publicAction({ n: 1 })).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect(ran).not.toHaveBeenCalled();
  });

  it("runs for a vouched request", async () => {
    actor = member;
    expect(await privateAction({ n: 1 })).toEqual({ ok: true, data: 2 });
    actor = null;
    expect(await publicAction({ n: 1 })).toEqual({ ok: true, data: 2 });
    expect(await privateAction({ n: 1 })).toMatchObject({
      ok: false,
      error: { code: "unauthorized" },
    });
  });
});

describe("callers without a session share one budget per address", () => {
  it("limits anonymous calls across all actions", async () => {
    for (let i = 0; i < ANON_ACTION_LIMIT - 1; i++) await publicAction({ n: i });
    // The last allowed call may be any action, also one that needs a session.
    expect(await privateAction({ n: 1 })).toMatchObject({ error: { code: "unauthorized" } });
    ran.mockClear();
    expect(await publicAction({ n: 1 })).toMatchObject({
      ok: false,
      error: { code: "rate_limited" },
    });
    expect(await privateAction({ n: 1 })).toMatchObject({
      ok: false,
      error: { code: "rate_limited" },
    });
    expect(ran).not.toHaveBeenCalled();
  });

  it("counts per address and never counts signed-in callers", async () => {
    for (let i = 0; i < ANON_ACTION_LIMIT; i++) await publicAction({ n: i });
    expect(await publicAction({ n: 1 })).toMatchObject({ error: { code: "rate_limited" } });

    requestHeaders = pageRequest("198.51.100.2");
    expect(await publicAction({ n: 1 })).toEqual({ ok: true, data: 2 });

    requestHeaders = pageRequest("198.51.100.1");
    actor = member;
    for (let i = 0; i < ANON_ACTION_LIMIT + 5; i++) await privateAction({ n: i });
    expect(await privateAction({ n: 1 })).toEqual({ ok: true, data: 2 });
    expect(await publicAction({ n: 1 })).toEqual({ ok: true, data: 2 });
  });
});

describe("formDataToObject", () => {
  it("collects fields, repeats as arrays, and skips React's own fields", () => {
    const fd = new FormData();
    fd.append("title", "a");
    fd.append("tag", "x");
    fd.append("tag", "y");
    fd.append("tag", "z");
    fd.append("$ACTION_ID_abc", "");
    expect({ ...formDataToObject(fd) }).toEqual({ title: "a", tag: ["x", "y", "z"] });
  });

  it("never lets a field name reach a prototype", () => {
    const fd = new FormData();
    fd.append("__proto__", "polluted");
    fd.append("constructor", "c");
    fd.append("toString", "t");
    fd.append("hasOwnProperty", "h");
    const out = formDataToObject(fd);
    // Ordinary own keys of an object without a prototype…
    expect(Object.getPrototypeOf(out)).toBeNull();
    expect(Object.keys(out).sort()).toEqual([
      "__proto__",
      "constructor",
      "hasOwnProperty",
      "toString",
    ]);
    expect(out.toString).toBe("t");
    // …a name that exists on Object.prototype is not mistaken for a repeated field…
    expect(Array.isArray(out.constructor)).toBe(false);
    // …and nothing leaked to other objects.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.toString.call({})).toBe("[object Object]");
  });

  it("still validates through a schema, which drops unknown keys", () => {
    const fd = new FormData();
    fd.append("n", "5");
    fd.append("__proto__", "x");
    const parsed = z.object({ n: z.coerce.number() }).parse(formDataToObject(fd));
    expect(parsed).toEqual({ n: 5 });
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
  });
});
