import "server-only";
import { assertValidEnv } from "@/lib/env";
import { getDb } from "./db/client";
import { AppError } from "./errors";
import { createFirstOwner } from "./modules/auth/setup";
import { hasOwner } from "./modules/users/service";

/**
 * Fail fast on a broken configuration (e.g. no APP_SECRET in production).
 * When instrumentation's register() throws, Next.js logs it but keeps the
 * server up answering 500s — so in production we exit and let the container
 * restart policy surface the message instead.
 */
function checkEnv() {
  try {
    assertValidEnv();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") throw err;
    console.error(`[bootstrap] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

/** Idempotent startup tasks. Safe to run on every boot. */
export async function bootstrap() {
  checkEnv();
  getDb(); // opens the DB and applies pending migrations
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  if (email && password && !hasOwner()) {
    try {
      await createFirstOwner({ email, password, name: process.env.OWNER_NAME ?? "Owner" });
      console.log(`[bootstrap] owner account created for ${email}`);
    } catch (err) {
      // Someone completed /setup concurrently — nothing to do.
      if (err instanceof AppError && err.code === "forbidden") return;
      throw err;
    }
  }
}
