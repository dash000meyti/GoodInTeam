import { actorFromRequest } from "@/server/api/auth";
import { badRequest, errorResponse, readJsonBody } from "@/server/api/http";
import { callTool } from "@/server/api/registry";
import { logActivity } from "@/server/activity";

/** POST /api/v1/tools/{name} — body: tool input JSON (empty = {}) → { data }. */
export async function POST(req: Request, ctx: RouteContext<"/api/v1/tools/[name]">) {
  try {
    const { name } = await ctx.params;
    const actor = actorFromRequest(req);
    const body = await readJsonBody(req);
    if (!body.ok) return badRequest(body.message);
    const data = await callTool(actor, name, body.value);
    logActivity(actor, `api.${name}`, "api", null);
    return Response.json({ data });
  } catch (err) {
    return errorResponse(err);
  }
}
