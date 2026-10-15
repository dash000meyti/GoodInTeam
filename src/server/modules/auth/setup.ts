import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { AppError } from "@/server/errors";
import { hasOwner } from "@/server/modules/users/service";

export const setupDone = () => new AppError("forbidden", "Setup already completed");

/**
 * Create the first owner account (`/setup` and the OWNER_* env bootstrap).
 *
 * The "no owner yet" check and the insert run in one synchronous IMMEDIATE
 * transaction (better-sqlite3 is synchronous, and the write lock also covers
 * other processes), so two concurrent submissions can never both create an
 * owner — the second one fails with `forbidden`. The password is hashed
 * before the transaction because the transaction body must not await.
 */
export async function createFirstOwner(input: {
  name: string;
  email: string;
  password: string;
  locale?: "fa" | "en";
}) {
  // Cheap early exit so a closed /setup never burns scrypt time.
  if (hasOwner()) throw setupDone();
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  return db.transaction(
    (tx) => {
      const owner = tx.select({ id: users.id }).from(users).where(eq(users.role, "owner")).get();
      if (owner) throw setupDone();
      const clash = tx.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
      if (clash) throw new AppError("conflict", "A user with this email already exists");
      return tx
        .insert(users)
        .values({
          email,
          name: input.name.trim(),
          role: "owner",
          locale: input.locale ?? "fa",
          passwordHash,
        })
        .returning()
        .get();
    },
    { behavior: "immediate" },
  );
}
