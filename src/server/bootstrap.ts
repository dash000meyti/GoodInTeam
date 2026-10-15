import "server-only";
import { getDb } from "./db/client";
import { AppError } from "./errors";
import { createFirstOwner } from "./modules/auth/setup";
import { hasOwner } from "./modules/users/service";

/** Idempotent startup tasks. Safe to run on every boot. */
export async function bootstrap() {
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
