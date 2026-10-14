import { connection } from "next/server";
import { actorFromRequest } from "@/server/api/auth";
import { errorResponse } from "@/server/api/http";
import { toolJsonSchema, toolsFor } from "@/server/api/registry";

/** GET /api/v1/tools — tools available to the calling token. */
export async function GET(req: Request) {
  await connection(); // request-time only (reads the Authorization header)
  try {
    const actor = actorFromRequest(req);
    return Response.json({
      tools: toolsFor(actor).map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        scope: t.scope,
        endpoint: `/api/v1/tools/${t.name}`,
        inputSchema: toolJsonSchema(t),
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
