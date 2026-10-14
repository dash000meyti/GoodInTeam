import "server-only";
import { AppError, httpStatus } from "@/server/errors";

/** JSON error response in the API's standard shape. */
export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return Response.json(
      { error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } },
      {
        status: httpStatus[err.code],
        headers:
          err.code === "unauthorized"
            ? { "WWW-Authenticate": 'Bearer realm="good-team"' }
            : undefined,
      },
    );
  }
  console.error("[api] unexpected error", err);
  return Response.json({ error: { code: "internal", message: "Internal error" } }, { status: 500 });
}
