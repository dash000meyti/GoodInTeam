import "server-only";
import { count, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users, type UserRole } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { AppError } from "@/server/errors";

export function countUsers() {
  return db.select({ n: count() }).from(users).get()?.n ?? 0;
}

export function hasOwner() {
  return !!db.select({ id: users.id }).from(users).where(eq(users.role, "owner")).get();
}

export function findUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).get();
}

export async function createUser(input: {
  email: string;
  name: string;
  password?: string;
  role: UserRole;
  clientId?: string | null;
  locale?: "fa" | "en";
}) {
  const email = input.email.trim().toLowerCase();
  if (findUserByEmail(email))
    throw new AppError("conflict", "A user with this email already exists");
  return db
    .insert(users)
    .values({
      email,
      name: input.name.trim(),
      role: input.role,
      clientId: input.clientId ?? null,
      locale: input.locale ?? "fa",
      passwordHash: input.password ? await hashPassword(input.password) : null,
    })
    .returning()
    .get();
}
