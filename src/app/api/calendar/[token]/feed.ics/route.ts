import { connection } from "next/server";
import { rateLimit } from "@/server/auth/rate-limit";
import { buildFeed } from "@/server/modules/calendar/feeds";

/**
 * GET /api/calendar/<token>/feed.ics[?tasks=1] — private iCalendar feed
 * (subscribe from Google / Apple / Outlook). The token is the only credential.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/calendar/[token]/feed.ics">) {
  await connection();
  const { token } = await ctx.params;
  const limited = rateLimit(`ics:${token.slice(0, 12)}`, 120, 60_000);
  if (!limited.ok) return new Response("Too many requests", { status: 429 });
  const includeTasks = new URL(req.url).searchParams.get("tasks") === "1";
  const body = buildFeed(token, { includeTasks });
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="good-team.ics"',
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}
