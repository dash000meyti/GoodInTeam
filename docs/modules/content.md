# Module: Content (website, CMS, leads, media)

The public website (portfolio, blog/vlog/notes, courses, services, about, contact) and the
panel CMS that feeds it. Persian (`fa`, RTL, unprefixed URLs) is the default locale, English
lives under `/en`.

## Files

```
src/server/modules/content/
  queries.ts      PUBLIC cached reads ('use cache' + cacheTag("content")) — site, feeds, GEO
  service.ts      CMS (admin only): posts, status rules, slugs, translations, syndication,
                  series (courses), testimonials, view counter
  schemas.ts      zod inputs (shared by actions and tools)
  actions.ts      server actions → updateTag("content") + refresh()
  tools.ts        content_* tools (MCP + REST) → revalidateTag("content", "max")
  geo.ts          Markdown mirrors, /llms.txt, /llms-full.txt builders
src/server/modules/leads/{schemas,service,actions,tools}.ts   contact form → leads
src/server/modules/media/{storage,image-size,service,actions,tools}.ts   uploads
src/lib/content.ts          URL rules (postPath), blog types, SEO limits, YouTube ids (pure)
src/lib/arabic-shaping.ts   Persian shaping + bidi runs for OG images (pure, tested)

src/app/[locale]/(site)/    public pages (see "Routes")
src/components/site/        site chrome, cards, JSON-LD, SEO helpers, OG renderer, islands
src/app/[locale]/panel/{content,inbox,media}/   CMS, leads inbox, media library
src/app/{sitemap.ts,robots.ts,manifest.ts,llms.txt,llms-full.txt}
src/app/[locale]/feed.xml/route.ts   RSS 2.0 per locale
src/app/api/md/route.ts              Markdown mirrors (proxy rewrites *.md here)
src/app/media/[id]/[name]/route.ts   uploaded files
public/fonts/og/*.ttf                static TTF instances for OG images (OFL fonts)
```

## Content types & URLs

One `posts` table; `type` decides the URL (`postPath()` in `src/lib/content.ts`):

| type                      | URL                                         | Notes                                                      |
| ------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| `article`, `vlog`, `note` | `/blog/<slug>`                              | one URL namespace — slugs unique across the three types    |
| `work`                    | `/work/<slug>`                              | `meta`: client, year, role, stack, links, metrics, gallery |
| `tutorial`                | `/learn/<series>/<slug>` or `/learn/<slug>` | lesson of a course (`series`) or standalone                |
| `service`                 | `/services/<slug>`                          | `meta.icon` (lucide name), `meta.faq` → FAQPage            |
| `page`                    | `/about` (slug `about`)                     | about page body + profile settings                         |

`/learn/<slug>` resolves to a **course landing** when a published series has that slug,
otherwise to a **standalone tutorial**. Slugs keep Persian letters (`slugify`); URLs are
percent-encoded in links/canonicals and decoded in route params.

Translations share `translationKey`. The language toggle and `hreflang` alternates point to
the translation; without one, the toggle falls back to the section index.

### Status & scheduling

`draft` · `scheduled` · `published` · `archived`. Saving normalizes: published + future date
→ scheduled; scheduled + past date → published; published without a date → now. Visibility at
query time: `status in (published, scheduled) AND coalesce(published_at, created_at) <= now`.
Cached queries shorten their lifetime when the next scheduled post goes live within the hour,
so scheduled posts appear on time without a cron job.

## Caching & rendering

- No DB at build time. Public pages keep header/footer/hero copy in the static shell and
  stream DB parts inside `<Suspense>` with layout-matching skeletons. Each DB-backed component
  (and `generateMetadata`, sitemap, feeds, GEO routes) calls `await connection()` first, then
  the cached functions in `queries.ts`.
- `queries.ts`: `'use cache'` + `cacheTag("content")` + `cacheLife("hours")` (or shorter, see
  scheduling). `renderContent(md)` caches Markdown → HTML (Shiki) by content (`max`).
- Invalidation: CMS actions call `updateTag("content")` (read-your-own-writes); tools and route
  handlers call `revalidateTag("content", "max")`. View counts are written without
  invalidation (lists may lag by the cache lifetime).
- Missing slugs inside streamed pages call `notFound()` → noindex soft 404; unknown top-level
  URLs hit `(site)/[...rest]` → real 404 inside the site layout.

## Public pages

Home (hero with animated SVG system diagram, client marquee, featured work bento, services
bento, CSS-only tabbed "transparency" showcase, live stats, latest posts + course card,
testimonials, CTA), `/work` (+ stack/year filters), `/work/<slug>`, `/blog` (type & tag
filters, search `?q=`, pagination, featured), `/blog/<slug>` (TL;DR box, sticky TOC, lite
YouTube for vlogs, share links, syndication links, author box, related, prev/next),
`/learn`, `/learn/<course>`, `/learn/<course>/<lesson>`, `/services`, `/services/<slug>`,
`/about`, `/contact`.

Client JavaScript on public pages is limited to tiny islands (`components/site/islands.tsx`,
`header-client.tsx`, `contact-form.tsx`): header scroll state/active link/language
target/mobile menu (native Popover API), lite YouTube, copy link, TOC highlight, view counter.
The site ships only the `common` + `nav` message namespaces; islands get labels as props.

## SEO / AEO / GEO

See `docs/seo.md` for the full checklist. Endpoints: `/sitemap.xml`, `/robots.txt`,
`/manifest.webmanifest`, `/feed.xml` + `/en/feed.xml`, `/llms.txt`, `/llms-full.txt`,
`<page>.md` mirrors, per-post `opengraph-image` (blog, work) and a default one for the site.

OG images: Satori can't shape Arabic script or lay out RTL, so `src/lib/arabic-shaping.ts`
converts Persian to presentation forms in visual order and the renderer lays out word runs
with `row-reverse`. Fonts are static TTF instances (Satori can't read woff2) generated from
the bundled variable fonts (Vazirmatn incl. Latin, Public Sans) and stored in
`public/fonts/og`.

## CMS (panel)

- `/panel/content`: posts table (type, language, status, date, views) + filters & search,
  KPIs. Editor (`/panel/content/new?type=…`, `/panel/content/<id>`): title → auto slug
  (editable, live availability check per locale + URL namespace), TL;DR, Markdown (owner
  content may contain HTML), cover (media library or URL) + alt, tags, type cards (case study
  meta/metrics/gallery/linked project, service icon + FAQ, video URL, course + lesson order),
  SEO title/description with counters and a live Google preview, status & publish date/time
  (app timezone), featured, translations ("create translation" → linked draft in the other
  locale), syndication (POSSE: record the URL of each copy on X, LinkedIn, Telegram,
  Instagram, Mastodon, Bluesky, Threads, YouTube — shown on the post with
  `rel="syndication"`; auto-posting is a future integration), delete.
- `/panel/content/series` (courses) and `/panel/content/testimonials`.
- `/panel/inbox`: leads by status (new → contacted → qualified → won / lost, spam), detail
  drawer, reply by email, **convert to client** (creates a client and marks the lead won).
- `/panel/media`: drag & drop upload (≤ 20 MB; PNG, JPG, WebP, AVIF, GIF, SVG, PDF, MP4),
  sha256 de-duplication, alt text, copy URL, delete.

## Contact form → leads

`submitContactAction` (public): zod validation, honeypot field `website`, 5 submissions per
10 minutes per IP, stores the lead (locale, source, IP, UA), notifies owners/admins
(`lead.new`). Budget values are range keys (`lt5`, `5to15`, `15to50`, `gt50`, `unknown`).

## Media storage

Files are written to `${DATA_DIR}/uploads/<id>-<safe-name>` (outside the web root). The type
is sniffed from magic bytes (SVG additionally requires an `.svg` name and an `<svg>` root);
image dimensions come from PNG/JPEG/WebP/GIF headers (`image-size.ts`). `/media/<id>/<name>`
streams the file with the stored type, `X-Content-Type-Options: nosniff`, an ETag, immutable
caching for public files, single-range support (video), and
`Content-Security-Policy: …; sandbox` for SVG. Private files (`isPublic = false`) need a
session.

## Tools

`content_list_posts`, `content_get_post`, `content_create_post`, `content_update_post`,
`content_publish_post`, `content_delete_post` (destructive), `leads_list`,
`leads_update_status`, `media_list`. All admin-only.
