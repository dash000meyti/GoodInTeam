import { AppError, type AppErrorCode } from "@/server/errors";

/**
 * Stable keys for user/settings domain errors. Services throw `KeyedError`
 * with an English message (what REST/MCP clients see); server actions
 * translate the key into the user's language (`settings.error_<key>`).
 */
export const keyedErrorKeys = [
  "email_taken",
  "wrong_password",
  "password_mismatch",
  "password_same",
  "self_action",
  "last_owner",
  "owner_only",
  "client_role",
  "invalid_timezone",
] as const;
export type KeyedErrorKey = (typeof keyedErrorKeys)[number];

export class KeyedError extends AppError {
  constructor(
    public key: KeyedErrorKey,
    code: AppErrorCode,
    message: string,
    /** Form field the error belongs to (becomes a field error in forms). */
    public field?: string,
  ) {
    super(code, message, field ? { [field]: [message] } : undefined);
    this.name = "KeyedError";
  }
}

export const errors = {
  emailTaken: () =>
    new KeyedError("email_taken", "conflict", "A user with this email already exists", "email"),
  wrongPassword: () =>
    new KeyedError(
      "wrong_password",
      "validation",
      "Current password is incorrect",
      "currentPassword",
    ),
  passwordMismatch: () =>
    new KeyedError("password_mismatch", "validation", "Passwords do not match", "confirmPassword"),
  passwordSame: () =>
    new KeyedError(
      "password_same",
      "validation",
      "The new password must differ from the current one",
      "newPassword",
    ),
  selfAction: () =>
    new KeyedError("self_action", "forbidden", "You can't do this to your own account"),
  lastOwner: () =>
    new KeyedError("last_owner", "conflict", "There must always be at least one active owner"),
  ownerOnly: () =>
    new KeyedError("owner_only", "forbidden", "Only an owner can manage owner accounts"),
  clientRole: () =>
    new KeyedError(
      "client_role",
      "validation",
      "Client portal accounts can't be given a team role (and vice versa)",
    ),
  invalidTimezone: () =>
    new KeyedError("invalid_timezone", "validation", "Unknown IANA timezone", "timezone"),
};
