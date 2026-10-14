import "server-only";
import { getDb } from "./db/client";
import { createUser, hasOwner } from "./modules/users/service";

/** Idempotent startup tasks. Safe to run on every boot. */
export async function bootstrap() {
  getDb(); // opens the DB and applies pending migrations
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  if (email && password && !hasOwner()) {
    await createUser({ email, password, name: process.env.OWNER_NAME ?? "Owner", role: "owner" });
    console.log(`[bootstrap] owner account created for ${email}`);
  }
}
