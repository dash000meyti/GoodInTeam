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

/** 400 for a request the server can't even parse (same error shape as above). */
export function badRequest(message: string) {
  return Response.json({ error: { code: "bad_request", message } }, { status: 400 });
}

/**
 * Read a JSON request body. An empty body means `{}` (tools without input);
 * anything that isn't valid JSON is reported instead of being silently
 * replaced — running a tool with input the client didn't send is wrong.
 */
export async function readJsonBody(
  req: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; message: string }> {
  const text = await req.text();
  if (!text.trim()) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, message: "Malformed JSON body" };
  }
}
