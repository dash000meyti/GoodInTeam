import { actorFromRequest } from "@/server/api/auth";
import { errorResponse } from "@/server/api/http";
import { callTool } from "@/server/api/registry";
import { logActivity } from "@/server/activity";

/** POST /api/v1/tools/{name} — body: tool input JSON → { data }. */
export async function POST(req: Request, ctx: RouteContext<"/api/v1/tools/[name]">) {
  try {
    const { name } = await ctx.params;
    const actor = actorFromRequest(req);
    const body =
      req.headers.get("content-length") === "0" ? {} : await req.json().catch(() => ({}));
    const data = await callTool(actor, name, body);
    logActivity(actor, `api.${name}`, "api", null);
    return Response.json({ data });
  } catch (err) {
    return errorResponse(err);
  }
}
