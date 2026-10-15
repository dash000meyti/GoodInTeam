import type { MetadataRoute } from "next";

/**
 * robots.txt (static). Public content is open to search engines AND to AI
 * crawlers/answer engines on purpose (GEO: being cited by ChatGPT, Claude,
 * Perplexity, Gemini, Apple Intelligence…). Private areas are disallowed for
 * everyone; authorization never relies on this file.
 */
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const privatePaths = [
  "/panel",
  "/en/panel",
  "/api/",
  "/login",
  "/en/login",
  "/setup",
  "/en/setup",
  "/sign/",
  "/en/sign/",
  "/p/",
  "/en/p/",
  "/i/",
  "/en/i/",
];

/** AI crawlers explicitly welcomed for public content (see docs/seo.md). */
const aiCrawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
  "MistralAI-User",
  "DuckAssistBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      {
        userAgent: aiCrawlers,
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: privatePaths,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
