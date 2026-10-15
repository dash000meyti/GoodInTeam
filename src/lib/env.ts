import "server-only";
import path from "node:path";
import { trustProxyFromEnv } from "@/server/auth/client-ip";

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
    if (!s || s === "change-me-to-a-long-random-string") {
      if (
        process.env.NODE_ENV === "production" &&
        process.env.NEXT_PHASE !== "phase-production-build"
      ) {
        throw new Error("APP_SECRET must be set to a long random string in production.");
      }
      return "dev-insecure-secret-do-not-use-in-production";
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
