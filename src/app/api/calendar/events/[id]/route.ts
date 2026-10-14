import { connection } from "next/server";
import { errorResponse } from "@/server/api/http";
import { getActor } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { eventIcsFile } from "@/server/modules/calendar/feeds";

/** GET /api/calendar/events/<id> — download one event as .ics (signed-in staff). */
export async function GET(_req: Request, ctx: RouteContext<"/api/calendar/events/[id]">) {
  await connection();
  try {
    const actor = await getActor();
    if (!actor) throw new AppError("unauthorized", "Not signed in");
    const { id } = await ctx.params;
    const { body, filename } = eventIcsFile(actor, id);
    const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
    return new Response(body, {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
