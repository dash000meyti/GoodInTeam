import { connection } from "next/server";
import { getDb } from "@/server/db/client";

/** Liveness/readiness probe for Docker & uptime monitors. */
export async function GET() {
  await connection();
  try {
    getDb().sqlite.prepare("select 1").get();
    return Response.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch (err) {
    return Response.json({ ok: false, db: "down", error: String(err) }, { status: 503 });
  }
}
