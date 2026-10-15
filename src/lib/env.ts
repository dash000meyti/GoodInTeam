import "server-only";
import path from "node:path";
import { parseTrustProxy, trustProxyFromEnv } from "@/server/auth/client-ip";

const SECRET_PLACEHOLDER = "change-me-to-a-long-random-string";
const DEV_SECRET = "dev-insecure-secret-do-not-use-in-production";
const SECRET_MIN_LENGTH = 32;
const GENERATE_SECRET = `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`;

const isUsableSecret = (s: string | undefined): s is string =>
  !!s && s.trim() !== "" && s !== SECRET_PLACEHOLDER && s !== DEV_SECRET;

/** Centralised, typed access to environment configuration (server only). */
export const env = {
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get dataDir() {
    return path.resolve(
      /*turbopackIgnore: true*/ process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
    );
  },
  get appSecret() {
    const s = process.env.APP_SECRET;
    if (!isUsableSecret(s)) {
      if (
        process.env.NODE_ENV === "production" &&
        process.env.NEXT_PHASE !== "phase-production-build"
      ) {
        throw new Error("APP_SECRET must be set to a long random string in production.");
      }
      return DEV_SECRET;
    }
    return s;
  },
  get timezone() {
    return process.env.APP_TIMEZONE ?? "Asia/Tehran";
  },
  /** Which proxy headers carry the client IP (`none` | `cloudflare` | `xff:N`). */
  get trustProxy() {
    return trustProxyFromEnv();
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};

/** Configuration problems: `errors` must stop the server, `warnings` are logged. */
export function envProblems(e: NodeJS.ProcessEnv = process.env) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (e.NODE_ENV === "production") {
    if (!isUsableSecret(e.APP_SECRET)) {
      errors.push(
        `APP_SECRET must be set to a long random string in production. Generate one with: ${GENERATE_SECRET}`,
      );
    } else if (e.APP_SECRET.length < SECRET_MIN_LENGTH) {
      warnings.push(
        `APP_SECRET is shorter than ${SECRET_MIN_LENGTH} characters; use 32+ random bytes (${GENERATE_SECRET}).`,
      );
    }
  }
  if (parseTrustProxy(e.TRUST_PROXY) === null) {
    errors.push(`TRUST_PROXY="${e.TRUST_PROXY}" is invalid. Use none, cloudflare or xff:<N>.`);
  }
  return { errors, warnings };
}

/**
 * Validate the configuration at boot (src/server/bootstrap.ts) so a missing
 * secret fails fast instead of on the first request that needs it.
 */
export function assertValidEnv(e: NodeJS.ProcessEnv = process.env) {
  const { errors, warnings } = envProblems(e);
  for (const w of warnings) console.warn(`[env] ${w}`);
  if (errors.length) throw new Error(`Invalid configuration:\n- ${errors.join("\n- ")}`);
}
