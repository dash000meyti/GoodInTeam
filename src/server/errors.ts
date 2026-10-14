/**
 * Typed application errors. Services throw these; the action/API/MCP adapters
 * translate them into user-facing results with the right status code.
 */
export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "internal";

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const httpStatus: Record<AppErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  conflict: 409,
  rate_limited: 429,
  internal: 500,
};

export const notFound = (what = "Resource") => new AppError("not_found", `${what} not found`);
export const forbidden = (msg = "You do not have access to this resource") =>
  new AppError("forbidden", msg);
