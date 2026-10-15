# SEO · AEO · GEO

Goal: rank in Google/Bing (**SEO**), be the quoted answer in answer engines & featured
snippets (**AEO**), and be understood/cited by LLM-based search and agents — ChatGPT search,
Perplexity, Claude, Gemini (**GEO**). Implementation details: `docs/modules/content.md`.

## Technical SEO

- Server-rendered HTML for all public content (RSC + streaming); static shells per locale
  (header, footer, hero copy), DB content streamed in `<Suspense>` (no DB at build time).
  Bots that need metadata in `<head>` get a blocking render automatically (Next.js).
- `<html lang dir>` per locale. Every public page sets `alternates` via
  `pageMetadata()` (`src/components/site/seo.ts`): canonical, `hreflang` for each locale that
  really has the page (posts: via `translation_key`) + `x-default` (Persian), RSS and Markdown
  alternates (`<link rel="alternate" type="text/markdown">`).
- Canonical URLs: fa unprefixed, en under `/en`; `/fa/...` permanently redirects (except
  generated `opengraph-image` URLs, served directly). Filtered/searched blog listings are
  `noindex, follow`; paginated pages are self-canonical.
- `sitemap.xml` (`src/app/sitemap.ts`): sections × locales, every published post and course
  with `lastModified`, `hreflang` alternates and cover images.
- `robots.txt` (`src/app/robots.ts`): public content open to everyone; `/panel`, `/api/`,
  `/login`, `/setup`, `/sign/`, `/p/`, `/i/` disallowed (both locales). AI crawlers are
  **explicitly welcomed** for public content (decision: GEO visibility matters more than opting
  out): GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User,
  anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot,
  Meta-ExternalAgent, MistralAI-User, DuckAssistBot. Authorization never relies on robots.
- `manifest.webmanifest` (`src/app/manifest.ts`).
- Per-page `generateMetadata`: title template, description (SEO fields → excerpt → body),
  OG/Twitter cards, `article:published_time/modified_time/author/tag/section`.
- OG images: `opengraph-image.tsx` for blog posts and case studies + a default for the site
  (1200×630, brand colors, RTL-correct Persian via pre-shaping, Vazirmatn/Public Sans TTFs).
- Performance budget: LCP < 2.0s, CLS < 0.05, INP < 200ms. Self-hosted fonts, `next/image`
  (AVIF/WebP) for local covers with `sizes` and eager/high priority on the LCP image, CSS-only
  animations (reduced motion respected), no client JS beyond small islands.
- Missing slugs inside streamed pages render the 404 UI with `noindex`; unknown URLs get a
  real 404 inside the site layout.

## Structured data (JSON-LD, `src/components/site/json-ld.tsx`)

| Page                  | Schema                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| all (site layout)     | `Organization`, `Person` (owner), `WebSite` + `SearchAction` (`/blog?q=`)  |
| article / note / vlog | `BlogPosting` (author, dates, image, keywords, wordCount, inLanguage)      |
| vlog                  | + `VideoObject` (thumbnail, uploadDate, embedUrl)                          |
| tutorial / lesson     | `LearningResource` (+ `isPartOf` `Course`)                                 |
| course (`/learn/<s>`) | `Course` (provider, offers: free, hasCourseInstance, hasPart lessons)      |
| `/learn`              | `ItemList` of courses                                                      |
| work                  | `CreativeWork` (client as `sourceOrganization`, year, stack as `keywords`) |
| `/services`           | `ItemList` of `Service` + `FAQPage`                                        |
| service               | `Service` + `Offer` + `FAQPage` (`meta.faq` or the studio FAQ)             |
| about                 | `AboutPage` / `ProfilePage` (mainEntity → Person)                          |
| contact               | `ContactPage`                                                              |
| all deep pages        | `BreadcrumbList` (rendered with the visible breadcrumbs)                   |

Payloads are serialized with `<` escaped as a JSON unicode escape (see `JsonLd`).

## AEO (answer engines)

- Each article/lesson shows its **TL;DR / خلاصه** (the `excerpt`) in a highlighted box at the
  top; the editor asks for 2–3 sentences answering the core question.
- Question-style H2s + concise paragraphs; headings get stable anchors and a sticky TOC.
- FAQ blocks with `FAQPage` markup on services (and articles with `meta.faq`).
- Tables and lists render cleanly in `.prose-gt`.

## GEO (LLMs & agents)

- `/llms.txt` — llmstxt.org index: who we are (both languages), contact & availability,
  services, case studies, courses and posts (linking to their `.md` mirrors), key pages, API/MCP
  note, `llms-full.txt`.
- `/llms-full.txt` — the full text of every published post in Markdown.
- **Markdown mirrors**: append `.md` to `/blog/<slug>`, `/work/<slug>`, `/learn/<course>`,
  `/learn/<course>/<lesson>`, `/learn/<tutorial>`, `/services/<slug>`, `/about` (both locales)
  → `text/markdown` with YAML front matter (title, description, type, date, updated, author,
  lang, canonical, tags) and a `Link: <html>; rel="canonical"` header.
- RSS 2.0 feeds per locale (`/feed.xml`, `/en/feed.xml`) with full HTML in
  `content:encoded`, categories and `dc:creator`.
- POSSE: copies on social networks are recorded per post and linked with
  `rel="syndication"`; posts carry microformats2 (`h-entry`, `p-name`, `e-content`).
- Stable, descriptive URLs (Persian slugs allowed); authorship and dates everywhere (E-E-A-T).
- The MCP server lets agents act on the panel; public content stays crawlable without auth.

## Validation (run before shipping SEO changes)

Against a production build (`pnpm build && PORT=3100 pnpm start`):

- every public page type returns 200 with one `<h1>`, a description, a canonical and valid
  JSON-LD (`<script type="application/ld+json">` parses; expected `@type`s per the table above);
- `/sitemap.xml`, `/feed.xml`, `/en/feed.xml` are well-formed XML (`xmllint --noout`);
- `/robots.txt`, `/llms.txt`, `/llms-full.txt` and a `<page>.md` mirror respond with the right
  content type;
- OG images (`og:image` of the home page, a post and a case study) render 1200×630 with correct
  Persian shaping; unknown URLs return 404 and filtered listings carry `noindex, follow`.
