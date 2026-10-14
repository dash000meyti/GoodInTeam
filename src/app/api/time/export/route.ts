import { connection } from "next/server";
import { addDays, fromDateInput } from "@/lib/tz";
import { isStaff } from "@/server/auth/actor";
import { getActor } from "@/server/auth/session";
import { errorResponse } from "@/server/api/http";
import { AppError } from "@/server/errors";
import { appTimezone } from "@/server/modules/settings/service";
import { exportEntriesCsv } from "@/server/modules/time/service";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/time/export?from=YYYY-MM-DD&to=YYYY-MM-DD[&user=<id|all>][&project=<id>]
 * Session-authenticated CSV download of time entries (to is inclusive).
 */
export async function GET(req: Request) {
  await connection();
  try {
    const actor = await getActor();
    if (!actor) throw new AppError("unauthorized", "Not signed in");
    if (!isStaff(actor)) throw new AppError("forbidden", "Forbidden");
    const url = new URL(req.url);
    const fromKey = url.searchParams.get("from") ?? "";
    const toKey = url.searchParams.get("to") ?? "";
    if (!DAY_RE.test(fromKey) || !DAY_RE.test(toKey))
      throw new AppError("validation", "from and to must be YYYY-MM-DD");
    const tz = appTimezone();
    const from = fromDateInput(fromKey, undefined, tz);
    const to = addDays(fromDateInput(toKey, undefined, tz), 1, tz);
    const csv = await exportEntriesCsv(actor, {
      from,
      to,
      userId: url.searchParams.get("user"),
      projectId: url.searchParams.get("project") ?? undefined,
    });
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="time-${fromKey}_${toKey}.csv"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
