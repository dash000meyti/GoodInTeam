import "server-only";
import { getMessages } from "@/i18n/server";
import { requestLocale } from "@/server/action";
import { AppError } from "@/server/errors";
import { KeyedError } from "./errors";

/**
 * Run a service call from a server action and translate `KeyedError`s into
 * the user's language. Field-bound errors become form field errors; others
 * become a toast message (validation code keeps the specific text).
 */
export async function localized<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof KeyedError) {
      const t = getMessages(await requestLocale()).settings;
      const message = t[`error_${err.key}`];
      throw new AppError("validation", message, err.field ? { [err.field]: [message] } : undefined);
    }
    throw err;
  }
}
