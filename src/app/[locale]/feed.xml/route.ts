import { connection } from "next/server";
import { isLocale, localeMeta, localePath } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { env } from "@/lib/env";
import { postPath } from "@/lib/content";
import { getPublicProfile, listFullPosts, renderContent } from "@/server/modules/content/queries";

/**
 * RSS 2.0 feed per locale: /feed.xml (fa, via the proxy rewrite) and
 * /en/feed.xml — full HTML content in <content:encoded>.
 */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

/** Make relative URLs in rendered HTML absolute (feed readers have no base URL). */
const absolutize = (html: string) => html.replace(/(href|src)="\/(?!\/)/g, `$1="${env.siteUrl}/`);

export async function GET(_req: Request, ctx: RouteContext<"/[locale]/feed.xml">) {
  const { locale } = await ctx.params;
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  await connection();
  const t = messages[locale];
  const [posts, profile] = await Promise.all([
    listFullPosts(locale, ["article", "tutorial", "vlog", "note", "work"], 40),
    getPublicProfile(),
  ]);
  const site = `${env.siteUrl}${localePath(locale, "/")}`;
  const self = `${env.siteUrl}${localePath(locale, "/feed.xml")}`;
  const items = await Promise.all(
    posts.map(async (p) => {
      const link = `${env.siteUrl}${localePath(locale, postPath(p))}`;
      const { html } = await renderContent(p.contentMd);
      const author = p.authorName ?? profile.ownerName[locale];
      const cover = p.coverUrl
        ? p.coverUrl.startsWith("http")
          ? p.coverUrl
          : `${env.siteUrl}${p.coverUrl}`
        : null;
      const body = `${p.excerpt ? `<p><strong>${esc(t.site.tldr)}:</strong> ${esc(p.excerpt)}</p>` : ""}${cover ? `<p><img src="${esc(cover)}" alt="${esc(p.coverAlt ?? p.title)}"/></p>` : ""}${absolutize(html)}`;
      return [
        "<item>",
        `<title>${esc(p.title)}</title>`,
        `<link>${esc(link)}</link>`,
        `<guid isPermaLink="true">${esc(link)}</guid>`,
        p.publishedAt ? `<pubDate>${p.publishedAt.toUTCString()}</pubDate>` : "",
        author ? `<dc:creator>${esc(author)}</dc:creator>` : "",
        `<category>${esc(t.site[`type_${p.type}`])}</category>`,
        ...p.tags.map((tag) => `<category>${esc(tag)}</category>`),
        `<description>${cdata(p.excerpt ?? p.title)}</description>`,
        `<content:encoded>${cdata(body)}</content:encoded>`,
        "</item>",
      ]
        .filter(Boolean)
        .join("");
    }),
  );
  const lastBuild = posts[0]?.publishedAt ?? new Date(0);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(profile.brandName[locale] || t.common.appName)}</title>
<link>${esc(site)}</link>
<description>${esc(t.site.metaDescription)}</description>
<language>${localeMeta[locale].intl}</language>
<lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
<generator>Good Team (Next.js)</generator>
<atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>
<image><url>${esc(`${env.siteUrl}/icon.svg`)}</url><title>${esc(profile.brandName[locale] || t.common.appName)}</title><link>${esc(site)}</link></image>
${items.join("\n")}
</channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=86400",
    },
  });
}
