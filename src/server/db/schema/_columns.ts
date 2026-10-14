import { integer, text } from "drizzle-orm/sqlite-core";
import { newId } from "@/lib/ids";

/** Primary key: 16-char random id. */
export const pk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => newId());

/** Timestamps are stored as integer milliseconds (UTC) and surface as Date. */
export const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const createdAt = () =>
  timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date());

export const updatedAt = () =>
  timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

export const bool = (name: string) => integer(name, { mode: "boolean" });

/** JSON column (stored as TEXT). */
export const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

/** Money amount in minor units (integer). Always pair with a currency column. */
export const money = (name: string) => integer(name);
