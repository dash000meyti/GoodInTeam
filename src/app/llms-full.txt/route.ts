import { connection } from "next/server";
import { buildLlmsFull } from "@/server/modules/content/geo";

/** /llms-full.txt — the full text of all published content, in Markdown. */
export async function GET() {
  await connection();
  return new Response(await buildLlmsFull(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
