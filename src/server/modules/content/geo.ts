import "server-only";
import { localePath, locales, type Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { env } from "@/lib/env";
import { postPath, type ContentType } from "@/lib/content";
import {
  getPublicProfile,
  getPublishedPost,
  getSeriesWithLessons,
  listFullPosts,
  listPublished,
  listSeries,
  listServices,
  type PostCard,
  type PostDetail,
} from "./queries";

/**
 * GEO outputs for LLMs and agents: Markdown mirrors (`*.md`), /llms.txt and
 * /llms-full.txt. Pure string builders over the cached content queries —
 * callers (route handlers) must be request-time (`await connection()`).
 */

const abs = (p: string) => `${env.siteUrl}${p}`;
const url = (locale: Locale, p: { type: ContentType; slug: string; seriesSlug?: string | null }) =>
  abs(localePath(locale, postPath(p)));

/** Minimal, safe YAML front matter (strings are JSON-quoted → valid YAML). */
export function frontMatter(fields: Record<string, string | number | string[] | null | undefined>) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (Array.isArray(v)) lines.push(`${k}: [${v.map((x) => JSON.stringify(x)).join(", ")}]`);
    else lines.push(`${k}: ${typeof v === "number" ? v : JSON.stringify(v)}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

function metaLines(post: PostCard, t: (typeof messages)[Locale]) {
  const m = post.meta;
  const rows: string[] = [];
  if (post.type === "work") {
    if (m.client) rows.push(`- **${t.site.client}:** ${m.client}`);
    if (m.year) rows.push(`- **${t.site.year}:** ${m.year}`);
    if (m.role) rows.push(`- **${t.site.role}:** ${m.role}`);
    if (m.stack?.length) rows.push(`- **${t.site.stack}:** ${m.stack.join(", ")}`);
    if (m.liveUrl) rows.push(`- **${t.site.liveSite}:** ${m.liveUrl}`);
    for (const x of m.metrics ?? []) rows.push(`- **${x.label}:** ${x.value}`);
  }
  if (post.videoUrl) rows.push(`- **Video:** ${post.videoUrl}`);
  return rows.length ? `${rows.join("\n")}\n\n` : "";
}

/** One post as clean Markdown with front matter. */
export function postToMarkdown(
  post: PostCard & { contentMd: string; authorName?: string | null },
  opts: { locale: Locale; author?: string | null; withFrontMatter?: boolean } = {
    locale: post.locale,
  },
) {
  const t = messages[opts.locale];
  const canonical = url(opts.locale, post);
  const head =
    opts.withFrontMatter === false
      ? ""
      : frontMatter({
          title: post.title,
          description: post.excerpt,
          type: post.type,
          date: post.publishedAt?.toISOString(),
          updated: post.updatedAt.toISOString(),
          author: post.authorName ?? opts.author,
          lang: opts.locale,
          canonical,
          tags: post.tags,
          series: post.seriesTitle,
        });
  const tldr = post.excerpt ? `> **${t.site.tldr}:** ${post.excerpt}\n\n` : "";
  return `${head}# ${post.title}\n\n${tldr}${metaLines(post, t)}${post.contentMd.trim()}\n`;
}

/** Resolve a public path (without locale, without `.md`) to Markdown. */
export async function markdownForPath(
  locale: Locale,
  path: string,
): Promise<{ md: string; canonical: string } | null> {
  const parts = path
    .split("/")
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  const profile = await getPublicProfile();
  const author = profile.ownerName[locale] || profile.ownerName.en || null;
  const one = async (types: ContentType[], slug: string) => {
    const post = await getPublishedPost(locale, types, slug);
    return post
      ? { md: postToMarkdown(post, { locale, author }), canonical: url(locale, post) }
      : null;
  };

  const [section, a, b] = parts;
  if (section === "blog" && a && !b) return one(["article", "vlog", "note"], a);
  if (section === "work" && a && !b) return one(["work"], a);
  if (section === "services" && a && !b) return one(["service"], a);
  if (section === "about" && !a) return one(["page"], "about");
  if (section === "learn" && a && b) {
    const course = await getSeriesWithLessons(locale, a);
    const post = await getPublishedPost(locale, ["tutorial"], b);
    if (!course || !post || post.seriesId !== course.series.id) return null;
    return { md: postToMarkdown(post, { locale, author }), canonical: url(locale, post) };
  }
  if (section === "learn" && a && !b) {
    const course = await getSeriesWithLessons(locale, a);
    if (course) {
      const canonical = abs(localePath(locale, `/learn/${encodeURIComponent(course.series.slug)}`));
      const lessons = course.lessons
        .map(
          (l, i) =>
            `${i + 1}. [${l.title}](${url(locale, l)})${l.excerpt ? ` — ${l.excerpt}` : ""}`,
        )
        .join("\n");
      const md = `${frontMatter({
        title: course.series.title,
        description: course.series.description,
        type: "course",
        level: course.series.level,
        lang: locale,
        canonical,
        updated: course.series.updatedAt.toISOString(),
      })}# ${course.series.title}\n\n${course.series.description ?? ""}\n\n## ${messages[locale].site.courseContents}\n\n${lessons}\n`;
      return { md, canonical };
    }
    const post: PostDetail | null = await getPublishedPost(locale, ["tutorial"], a);
    if (post && !post.seriesId)
      return { md: postToMarkdown(post, { locale, author }), canonical: url(locale, post) };
  }
  return null;
}

/** /llms.txt — curated index (llmstxt.org format), both languages. */
export async function buildLlmsTxt() {
  const profile = await getPublicProfile();
  const fa = messages.fa;
  const en = messages.en;
  const brand = profile.brandName.en || en.common.appName;
  const out: string[] = [];
  out.push(`# ${brand} (${profile.brandName.fa || fa.common.appName})`, "");
  out.push(`> ${profile.bio.en || en.site.metaDescription}`, "");
  out.push(
    `${profile.bio.fa || fa.site.metaDescription}`,
    "",
    `- Owner: ${[profile.ownerName.en, profile.ownerName.fa].filter(Boolean).join(" / ") || brand}`,
    `- Location: ${profile.location.en}`,
    `- Languages: Persian (default, RTL, ${abs("/")}) and English (${abs("/en")})`,
    `- Contact: ${profile.email ? `${profile.email} · ` : ""}${abs("/contact")} (form) · ${profile.availableForWork ? "currently available for new projects" : "currently fully booked"}`,
    "- Every article, case study, lesson and service page has a clean Markdown version: append `.md` to its URL (e.g. `/blog/<slug>.md`).",
    "",
  );
  for (const locale of locales) {
    const t = messages[locale];
    const [services, work, blog, courses] = await Promise.all([
      listServices(locale),
      listPublished({ locale, types: ["work"], pageSize: 50 }),
      listPublished({ locale, types: ["article", "vlog", "tutorial"], pageSize: 30 }),
      listSeries(locale),
    ]);
    const label = locale === "fa" ? "فارسی" : "English";
    const link = (title: string, u: string, desc?: string | null) =>
      `- [${title}](${u}.md)${desc ? `: ${desc}` : ""}`;
    out.push(`## ${t.site.servicesPageTitle} (${label})`, "");
    for (const s of services) out.push(link(s.title, url(locale, s), s.excerpt));
    out.push("");
    if (work.items.length) {
      out.push(`## ${t.site.workPageTitle} (${label})`, "");
      for (const w of work.items) out.push(link(w.title, url(locale, w), w.excerpt));
      out.push("");
    }
    if (blog.items.length || courses.length) {
      out.push(`## ${t.site.blogTitle} & ${t.site.learnTitle} (${label})`, "");
      for (const c of courses.filter((c) => c.lessons > 0))
        out.push(
          link(
            c.title,
            abs(localePath(locale, `/learn/${encodeURIComponent(c.slug)}`)),
            c.description,
          ),
        );
      for (const p of blog.items) out.push(link(p.title, url(locale, p), p.excerpt));
      out.push("");
    }
    out.push(`## ${t.site.footerExplore} (${label})`, "");
    out.push(
      `- [${t.nav.home}](${abs(localePath(locale, "/"))})`,
      `- [${t.site.aboutTitle}](${abs(localePath(locale, "/about"))}.md)`,
      `- [${t.nav.contact}](${abs(localePath(locale, "/contact"))})`,
      `- [RSS](${abs(localePath(locale, "/feed.xml"))})`,
      "",
    );
  }
  out.push(
    "## For AI agents",
    "",
    `- [OpenAPI 3.1](${abs("/api/v1/openapi.json")}): the private work OS (projects, time, content, leads…) is exposed as tools over REST and MCP (\`POST ${abs("/api/mcp")}\`) with a Bearer token created by the owner. Public content never requires auth.`,
    "",
    "## Optional",
    "",
    `- [llms-full.txt](${abs("/llms-full.txt")}): the full text of every published post in Markdown`,
    `- [Sitemap](${abs("/sitemap.xml")})`,
    "",
  );
  return out.join("\n");
}

/** /llms-full.txt — every published post in full Markdown. */
export async function buildLlmsFull() {
  const profile = await getPublicProfile();
  const posts = await listFullPosts(
    null,
    ["service", "work", "article", "tutorial", "vlog", "note", "page"],
    1000,
  );
  const head = `# ${profile.brandName.en} — full content\n\n> ${profile.bio.en}\n\nGenerated from the CMS. Each section below is one page; its canonical URL is in the metadata line.\n`;
  const body = posts
    .map((p) => {
      const md = postToMarkdown(p, {
        locale: p.locale,
        author: p.authorName,
        withFrontMatter: false,
      });
      const meta = `<!-- ${JSON.stringify({ url: url(p.locale, p), lang: p.locale, type: p.type, date: p.publishedAt?.toISOString(), updated: p.updatedAt.toISOString() })} -->`;
      return `${meta}\n${md.replace(/^# /, "## ")}`;
    })
    .join("\n---\n\n");
  return `${head}\n${body}`;
}
