import { connection } from "next/server";
import { getDb } from "@/server/db/client";

/** Liveness/readiness probe for Docker & uptime monitors. */
export async function GET() {
  await connection();
  try {
    getDb().sqlite.prepare("select 1").get();
    return Response.json(
      { ok: true, db: "up", time: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    // Details (paths, SQLite messages) stay in the server log, never in the response.
    console.error("[health] database check failed", err);
    return Response.json(
      { ok: false, db: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
