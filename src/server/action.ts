import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import type { UserRole } from "@/server/db/schema";
import { isLocale, type Locale } from "@/i18n/config";
import { getActor } from "./auth/session";
import { assertWrite, type Actor } from "./auth/actor";
import { isVouched, vouchedClientIp } from "./auth/edge";
import { rateLimit } from "./auth/rate-limit";
import { AppError, type AppErrorCode } from "./errors";

/**
 * Uniform result type returned by every server action. Client code checks
 * `res.ok` and shows `res.error.message` / `res.error.fieldErrors`.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: AppErrorCode; message: string; fieldErrors?: Record<string, string[]> };
    };

const zodLocales = { fa: z.locales.fa, en: z.locales.en } as const;

const messages: Record<Locale, Record<AppErrorCode, string>> = {
  fa: {
    unauthorized: "لطفاً دوباره وارد شوید.",
    forbidden: "به این بخش دسترسی ندارید.",
    not_found: "مورد درخواستی پیدا نشد.",
    validation: "لطفاً مقادیر فرم را بررسی کنید.",
    conflict: "این مورد با داده‌های موجود تداخل دارد.",
    rate_limited: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.",
    internal: "خطای غیرمنتظره‌ای رخ داد.",
  },
  en: {
    unauthorized: "Please sign in again.",
    forbidden: "You don't have access to this.",
    not_found: "Not found.",
    validation: "Please check the form fields.",
    conflict: "This conflicts with existing data.",
    rate_limited: "Too many requests, please try again shortly.",
    internal: "Something went wrong.",
  },
};

/** Locale of the current request (set by src/proxy.ts as x-gt-locale). */
export async function requestLocale(): Promise<Locale> {
  const l = (await headers()).get("x-gt-locale");
  return isLocale(l) ? l : "fa";
}

/**
 * Convert FormData into a plain object (repeated keys become arrays).
 *
 * Field names come from the client, so the object has no prototype: a field
 * called `__proto__` or `constructor` is an ordinary key that the zod schema
 * then drops, and `key in out` only ever sees fields that were really sent.
 */
export function formDataToObject(fd: FormData) {
  const out: Record<string, unknown> = Object.create(null);
  for (const [key, value] of fd.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (key in out) {
      const prev = out[key];
      out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else out[key] = value;
  }
  return out;
}

/** Server-action calls without a session, per client IP per minute (all actions together). */
export const ANON_ACTION_LIMIT = 300;
const ANON_ACTION_WINDOW_MS = 60_000;

/**
 * Every action starts here. An action is a public POST endpoint, so before it
 * looks at its input:
 * - the request must carry the proxy's voucher (server/auth/edge.ts): on a
 *   path that skipped src/proxy.ts nobody vetted the forwarding headers;
 * - the proxy must have routed it as a page of a real locale (`x-gt-locale`,
 *   which only the proxy sets): actions belong to pages, not to whatever
 *   else ends up at `[locale]` (an unknown `/api/…` path, a file prefix);
 * - a caller without a session spends from one per-IP budget shared by all
 *   actions, on top of the tighter limits of single actions (sign-in, contact
 *   form, signing).
 */
async function enterAction() {
  const h = await headers();
  if (!isVouched(h) || !isLocale(h.get("x-gt-locale"))) {
    throw new AppError("forbidden", "Request did not pass the proxy");
  }
  const actor = await getActor();
  if (!actor) {
    const ip = vouchedClientIp(h) ?? "unknown";
    if (!rateLimit(`action:anon:${ip}`, ANON_ACTION_LIMIT, ANON_ACTION_WINDOW_MS).ok) {
      throw new AppError("rate_limited", "Too many requests");
    }
  }
  return actor;
}

export function toActionError(err: unknown, locale: Locale): ActionResult<never> {
  if (err instanceof AppError) {
    return {
      ok: false,
      error: {
        code: err.code,
        message:
          err.code === "validation" && !err.fieldErrors ? err.message : messages[locale][err.code],
        fieldErrors: err.fieldErrors,
      },
    };
  }
  // Let Next.js control-flow errors (redirect/notFound) propagate.
  if (err && typeof err === "object" && "digest" in err) throw err;
  console.error("[action] unexpected error", err);
  return { ok: false, error: { code: "internal", message: messages[locale].internal } };
}

interface ActionOptions<S extends z.ZodType> {
  input: S;
  /** Allowed roles; default: any signed-in user. */
  roles?: UserRole[];
  /** Mutating action (requires write scope). Default true. */
  write?: boolean;
}

/**
 * Define a validated, authenticated server action.
 *
 * ```ts
 * "use server";
 * export const createTask = defineAction(
 *   { input: createTaskInput, roles: ["owner", "admin", "member"] },
 *   async (input, actor) => { const t = tasksService.create(actor, input); refresh(); return t; },
 * );
 * ```
 * Accepts a plain object (from client code) or FormData (from <form action>).
 */
export function defineAction<S extends z.ZodType, O>(
  opts: ActionOptions<S>,
  handler: (input: z.output<S>, actor: Actor) => Promise<O> | O,
) {
  return async (raw: z.input<S> | FormData): Promise<ActionResult<O>> => {
    const locale = await requestLocale();
    try {
      const actor = await enterAction();
      if (!actor) throw new AppError("unauthorized", "Not signed in");
      if (opts.roles && !opts.roles.includes(actor.user.role)) {
        throw new AppError("forbidden", "Forbidden");
      }
      if (opts.write !== false) assertWrite(actor);
      const data = raw instanceof FormData ? formDataToObject(raw) : raw;
      const parsed = opts.input.safeParse(data, { error: zodLocales[locale]().localeError });
      if (!parsed.success) {
        const flat = z.flattenError(parsed.error);
        throw new AppError(
          "validation",
          flat.formErrors[0] ?? messages[locale].validation,
          flat.fieldErrors as Record<string, string[]>,
        );
      }
      return { ok: true, data: await handler(parsed.data, actor) };
    } catch (err) {
      return toActionError(err, locale);
    }
  };
}

/** Same as defineAction but for unauthenticated public endpoints (contact form, signing). */
export function definePublicAction<S extends z.ZodType, O>(
  input: S,
  handler: (input: z.output<S>, ctx: { locale: Locale }) => Promise<O> | O,
) {
  return async (raw: z.input<S> | FormData): Promise<ActionResult<O>> => {
    const locale = await requestLocale();
    try {
      await enterAction();
      const data = raw instanceof FormData ? formDataToObject(raw) : raw;
      const parsed = input.safeParse(data, { error: zodLocales[locale]().localeError });
      if (!parsed.success) {
        const flat = z.flattenError(parsed.error);
        throw new AppError(
          "validation",
          flat.formErrors[0] ?? messages[locale].validation,
          flat.fieldErrors as Record<string, string[]>,
        );
      }
      return { ok: true, data: await handler(parsed.data, { locale }) };
    } catch (err) {
      return toActionError(err, locale);
    }
  };
}
