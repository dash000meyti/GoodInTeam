# SEO · AEO · GEO

Goal: rank in Google/Bing (**SEO**), be the quoted answer in answer engines & featured
snippets (**AEO**), and be understood/cited by LLM-based search and agents — ChatGPT search,
Perplexity, Claude, Gemini (**GEO**).

## Technical SEO

- Server-rendered HTML for all public content (RSC + streaming); static shells per locale.
- `<html lang dir>` per locale; `alternates.languages` (hreflang) + `x-default` on every page;
  translations linked via `posts.translation_key`.
- Canonical URLs (fa unprefixed, en under `/en`). `/fa/...` permanently redirects.
- `sitemap.xml` (all locales, `lastModified`, alternates), `robots.txt` (panel/api disallowed;
  AI crawlers explicitly allowed for public content).
- Per-page `generateMetadata`: title template, description, OG/Twitter cards, dynamic OG images
  (`opengraph-image.tsx`, RTL-aware with Vazirmatn).
- Performance budget: LCP < 2.0s, CLS < 0.05, INP < 200ms. Self-hosted fonts, AVIF/WebP images,
  no client JS on content pages beyond islands, CSS-only animations.

## Structured data (JSON-LD)

| Page           | Schema                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| all            | `Organization` / `Person`, `WebSite` (+ `SearchAction`)                |
| article / note | `BlogPosting` (author, datePublished, dateModified, image, inLanguage) |
| tutorial       | `LearningResource` / `HowTo` + `Course` for series                     |
| vlog           | `VideoObject`                                                          |
| work           | `CreativeWork` (client, year, stack as `keywords`)                     |
| services       | `Service` + `Offer`                                                    |
| about          | `AboutPage`, `ProfilePage`                                             |
| FAQ blocks     | `FAQPage`                                                              |
| all deep pages | `BreadcrumbList`                                                       |

## AEO (answer engines)

- Each article starts with a 2–3 sentence **TL;DR / خلاصه** answering the core question.
- Question-style H2s ("چرا…؟", "How to…") + concise paragraphs below them.
- FAQ sections with `FAQPage` markup on services and pillar articles.
- Tables and lists for comparisons (easy to extract).

## GEO (LLMs & agents)

- `/llms.txt` — curated index of the site (who we are, services, key pages) in Markdown;
  `/llms-full.txt` — full text of published content.
- **Markdown mirrors**: append `.md` to any article/work/tutorial URL (`/blog/slug.md`) to get
  clean Markdown with front-matter (title, date, author, canonical URL, language).
- `<link rel="alternate" type="text/markdown">` on content pages.
- RSS/Atom feeds per locale (`/feed.xml`, `/en/feed.xml`).
- Stable, descriptive URLs; authorship and dates everywhere (E-E-A-T); cite sources.
- The MCP server lets agents act on the panel; public content stays crawlable without auth.
