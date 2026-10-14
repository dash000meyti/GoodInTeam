import { connection } from "next/server";
import { isLocale } from "@/i18n/config";
import { isAdmin } from "@/server/auth/actor";
import { getActor } from "@/server/auth/session";
import { errorResponse } from "@/server/api/http";
import { AppError } from "@/server/errors";
import { toDateInputValue } from "@/lib/tz";
import { listTransactionsInput } from "@/server/modules/finance/schemas";
import { exportTransactionsCsv } from "@/server/modules/finance/service";
import { appTimezone } from "@/server/modules/settings/service";

/**
 * GET /api/finance/transactions?kind=&accountId=&from=&to=&q=…&locale=fa
 * CSV export of the filtered transactions (session auth, owner/admin only).
 */
export async function GET(req: Request) {
  await connection();
  try {
    const actor = await getActor();
    if (!actor) throw new AppError("unauthorized", "Not signed in");
    if (!isAdmin(actor)) throw new AppError("forbidden", "Forbidden");
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const { locale, page: _page, ...rest } = params;
    void _page;
    const parsed = listTransactionsInput.safeParse(rest);
    if (!parsed.success) throw new AppError("validation", "Invalid filters");
    const csv = exportTransactionsCsv(actor, parsed.data, isLocale(locale) ? locale : "fa");
    const day = toDateInputValue(Date.now(), appTimezone());
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="transactions-${day}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
