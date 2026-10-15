import { connection } from "next/server";
import { buildLlmsTxt } from "@/server/modules/content/geo";

/** /llms.txt — curated Markdown index of the site for LLMs (llmstxt.org). */
export async function GET() {
  await connection();
  return new Response(await buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
