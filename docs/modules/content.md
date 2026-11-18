# Module: Content (website, CMS, leads, media)

The public website (portfolio, blog/vlog/notes, courses, services, about, contact) and the
panel CMS that feeds it. Persian (`fa`, RTL, unprefixed URLs) is the default locale, English
lives under `/en`.

## Files

```
src/server/modules/content/
  queries.ts      PUBLIC cached reads ('use cache' + cacheTag("content")) — site, feeds, GEO
  query-args.ts   argument schemas of the cached reads (every cached function is a public endpoint)
  service.ts      CMS (admin only): posts, status rules, slugs, translations, syndication,
                  series (courses), testimonials, view counter
  schemas.ts      zod inputs (shared by actions and tools)
  actions.ts      server actions → updateTag("content") + refresh()
  tools.ts        content_* tools (MCP + REST) → revalidateTag("content", "max")
  geo.ts          Markdown mirrors, /llms.txt, /llms-full.txt builders
src/server/modules/leads/{schemas,service,actions,tools}.ts   contact form → leads
src/server/modules/media/{storage,image-size,service,actions,tools}.ts   uploads
src/app/api/media/route.ts  POST: upload one file (session cookie, same origin, ≤ 20 MB)
src/lib/html-sanitize.ts    the safe subset of HTML for published content (server only)
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

| type                      | URL                                         | Notes                                                         |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `article`, `vlog`, `note` | `/blog/<slug>`                              | one URL namespace — slugs unique across the three types       |
| `work`                    | `/work/<slug>`                              | `meta`: client, year, role, stack, links, metrics, gallery    |
| `tutorial`                | `/learn/<series>/<slug>` or `/learn/<slug>` | lesson of a course (`series`) or standalone                   |
| `service`                 | `/services/<slug>`                          | `meta.icon` (lucide name), `meta.brand`, `meta.faq` → FAQPage |
| `page`                    | `/about` (slug `about`)                     | about page body + profile settings                            |

`/learn/<slug>` resolves to a **course landing** when a published series has that slug,
otherwise to a **standalone tutorial**. Slugs keep Persian letters (`slugify`); URLs are
percent-encoded in links/canonicals and decoded in route params.

### Services and brands

Every service belongs to a Good In brand (see [../brand.md](../brand.md)): `meta.brand` is one
of the registry ids (`team`, `studio`, `code`), validated by
`z.preprocess(emptyToUndefined, z.enum(brandIds).optional())`. Readers use `brandOf(meta)`, so a
missing or invalid brand falls back to `team`. In the editor the "Good In brand" select sits next
to the icon select; "None" sends `""`, which clears it.

**Sync across locales** (`content/service.ts`, so the server action, REST and MCP all get it):
the brand is shared by a service's `translationKey` siblings. From the parsed `meta`:

- **set** (`meta.brand` defined) → `json_set(meta, '$.brand', …)` on every sibling service;
- **cleared** (`"brand" in meta`, value `undefined` — the editor sent `""`) → `json_remove`;
- **absent** (no `brand` key, or no `meta`) → no sync.

It runs in the same transaction as `createPost`/`updatePost`, last write wins, and never touches
a non-service post that shares the key. `createTranslation` copies `meta`, so a new translation
inherits the brand. Seed mapping: web, mobile, AI → `code`; consulting → `team`; the demo
`product-design` service → `studio`. Tested in `content/service.test.ts`.

**Brand pages.** Each sub-brand has a landing page at its registry `href`: `/studio` and `/code`
(and `/en/…`). The listed services of a brand are its live `type=service` posts whose
`brandOf(meta)` matches, in the same cells as the `/services` brand boxes
(`components/site/brand-services.tsx`). Case studies carry no brand (no `meta.brand`, tag or
service relation), so the brand pages show no work; a brand field on `work` posts would be the
honest way to add one. See [Public pages](#public-pages).

`updatePostInput`, `updateSeriesInput` and `updateTestimonialInput` are true partials: a field
that is absent stays as it is. Each create/update pair derives from one default-free field shape
in `schemas.ts` (`postFields`, `seriesFields`, `testimonialFields`); only the create schemas add
defaults (type `article`, locale `fa`, status `draft`, empty body), because zod 4 keeps
`.default()` inside `.partial()` (see `docs/conventions.md` → Forms). The editor saves through
`savePostInput`, a full form for create and update: type, locale, body and status are required,
never defaulted.

Translations share `translationKey`. The header language menu (icon button + dropdown, next to
the theme toggle) and `hreflang` alternates point to
the translation; without one, the toggle falls back to the section index.

### Status & scheduling

`draft` · `scheduled` · `published` · `archived`. Saving normalizes: published + future date
→ scheduled; scheduled + past date → published; published without a date → now. Visibility at
query time: `status in (published, scheduled) AND coalesce(published_at, created_at) <= now`.
Cached queries shorten their lifetime when the next scheduled post goes live within the hour,
so scheduled posts appear on time without a cron job.

### `updated_at` is the editorial date

`posts.updated_at` is what readers and crawlers get as "last modified": the visible "Updated on"
line, JSON-LD `dateModified`, `article:modified_time`, the sitemap `lastmod`, `llms-full.txt` and
the Markdown mirrors. The column bumps itself on every UPDATE (`$onUpdateFn`), so only an edit
may move it: `updatePost` and `setPostStatus` (a publish toggle) set it. Every other write to
`posts` keeps the stored value with `keepUpdatedAt()` in `content/service.ts` (drizzle skips
`$onUpdateFn` when `set` names the column): the view counter (`recordView`), the brand sync to
translation siblings, the translation key a post gets with its first translation, and the
removal of a series from its lessons. A new non-editorial write to `posts` must do the same.
A dedicated editorial `modified_at` (set only when title, excerpt, body, cover or meta change)
is planned; until then `updated_at` plays that role.

## Caching & rendering

- No DB at build time. Public pages keep header/footer/hero copy in the static shell and
  stream DB parts inside `<Suspense>` with layout-matching skeletons. Each DB-backed component
  (and `generateMetadata`, sitemap, feeds, GEO routes) calls `await connection()` first, then
  the cached functions in `queries.ts`.
- `queries.ts`: `'use cache'` + `cacheTag("content")` + `cacheLife("hours")` (or shorter, see
  scheduling).
- **Every cached function is a public endpoint** (it has a server reference id, like an
  action; [../security.md](../security.md#cached-functions)). Each one checks its arguments
  first with the schemas in `query-args.ts` (`checkArgs`): locale and type enums, row ids by
  shape, search text ≤ 200 characters, tag/stack ≤ 100, limits and page sizes ≤ 100. A call with
  anything else throws before any query runs, and a function that throws caches nothing. The
  three reads fed from the URL (`listPublished`, `getPublishedPost`, `getSeriesWithLessons`)
  are plain wrappers around their cached part: an over-long tag, a year outside the calendar or
  a slug no post can have is answered as an empty list / not found, without an error.
  `llms-full.txt` uses `listAllFullPosts()` (no arguments) instead of a large `limit`.
- **No cached function takes content as an argument.** `renderPost(postId, version)` renders
  the body of a post: the key is the post id and the version the caller saw (`updatedAt`), the
  body is loaded inside from the row that is visible now. It returns null for a post that is
  not public; `renderPostBody(post)` is the convenience for callers that hold the post. Used by
  the blog, work, service, about and lesson pages and by the feed.
- `getPublicProfile()` and `getPublicTimezone()` (studio time zone for the public and panel
  clocks) are cached with the tags `content` + `settings`.
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
`/studio`, `/code`, `/about`, `/contact`.

**Brand landing pages** (`/studio`, `/code`; one shared `BrandPage` in
`components/site/brand-page.tsx`, thin route folders with `loading.tsx` and
`opengraph-image.tsx`). Boxes: the first box (h1 = brand name, tagline, `site.brand<X>Intro`,
"Start a project" → `/contact` and "Explore services" → `#services`; the brand's `PixelLogo` in
the `tone="dots"` decor end cell, shown at every width) → the brand's services (streamed, the
`/services` cells, the "ask about" cell when the last row has room, the same full-row ask cell
when there are none) → the Good In family (the other brands; the master brand links home) →
`CtaBand`. Guide keys: `brand_<id>`, `brand_services_<id>`, `brand_family`, `cta`. Grid plans
live in `brand-plan.ts` (tested in `page-frame-plan.test.ts`). Every Studio/Code entry point
(brand menu, Spotlight, Launchpad, dock, footer, home brand cells, the service brand chip, the
`/services` brand boxes) links here; the `/services#studio` and `#code` anchors still work. A
new sub-brand page is a registry row plus `site.brand<X>Intro` (`brandIntro`), the two guide
lines and a route folder.

Client JavaScript on public pages is limited to tiny islands (`components/site/islands.tsx`,
`site-menubar-client.tsx`, `header-client.tsx`, `contact-form.tsx`, the dock's `DockLinks`, the
lazy guide): menu-bar popovers (native Popover API), Spotlight filter, language target, active
dock tile, lite YouTube, copy link, TOC highlight, view counter. See [../os-shell.md](../os-shell.md).
The site ships only the `common` + `nav` message namespaces; islands get labels as props.

## SEO / AEO / GEO

See `docs/seo.md` for the full checklist. Endpoints: `/sitemap.xml`, `/robots.txt`,
`/manifest.webmanifest`, `/feed.xml` + `/en/feed.xml`, `/llms.txt`, `/llms-full.txt`,
`<page>.md` mirrors, per-post `opengraph-image` (blog, work), one per brand page (`/studio`,
`/code`: the default card with the brand's pixel logo, `brand-og.tsx`) and a default one for
the site.

OG images: Satori can't shape Arabic script or lay out RTL, so `src/lib/arabic-shaping.ts`
converts Persian to presentation forms in visual order and the renderer lays out word runs
with `row-reverse`. Fonts are static TTF instances (Satori can't read woff2) generated from
the bundled variable fonts (Vazirmatn incl. Latin, Public Sans) and stored in
`public/fonts/og`.

## CMS (panel)

- `/panel/content`: posts table (type, language, status, date, views) + filters & search,
  KPIs. Editor (`/panel/content/new?type=…`, `/panel/content/<id>`): title → auto slug
  (editable, live availability check per locale + URL namespace), TL;DR, Markdown (may contain
  a safe subset of HTML, see "Raw HTML in posts"), cover (media library or URL) + alt, tags,
  type cards (case study meta/metrics/gallery/linked project, service icon + FAQ, video URL,
  course + lesson order),
  SEO title/description with counters and a live Google preview, status & publish date/time
  (app timezone), featured, translations ("create translation" → linked draft in the other
  locale), syndication (POSSE: record the URL of each copy on X, LinkedIn, Telegram,
  Instagram, Mastodon, Bluesky, Threads, YouTube — shown on the post with
  `rel="syndication"`; auto-posting is a future integration), delete.
- `/panel/content/series` (courses) and `/panel/content/testimonials`.
- Framed layout (docs/design-system.md "Frame", "Panel density"): the CMS sub-navigation (posts ·
  courses · testimonials) is a chip row of the page box, followed on the posts page by the KPIs
  row; lists are one box (filters row, then the table edge to edge or rows on phones);
  testimonials are cells of one framed grid. The post editor is **one box**: the writing column
  (fields, the type's sections, SEO) and the publishing column (publish — sticky from lg —,
  details, cover, translations, syndication, delete) share a hairline from lg.
- `/panel/inbox`: leads by status (new → contacted → qualified → won / lost, spam), detail
  drawer, reply by email, **convert to client** (creates a client and marks the lead won).
- `/panel/media`: drag & drop upload (≤ 20 MB; PNG, JPG, WebP, AVIF, GIF, SVG, PDF, MP4),
  sha256 de-duplication, alt text, copy URL, delete. One library box: the drop zone row, the
  kind chips, the files as cells of one framed grid (1 / 2 / 3 / 4 columns, dots fillers).
  The uploader sends one `POST /api/media` per file (not a server action: actions share a 2 MB
  body limit) and refreshes the list when the batch is done.

### Raw HTML in posts

A post's Markdown may contain HTML, but only a **safe subset** reaches a reader; there is no
raw-HTML mode (posts are served on the panel's origin, and an admin or an API token can
publish). `renderMarkdown(md, { allowHtml: true })` passes its whole output through the
allow-list in `src/lib/html-sanitize.ts` (the `sanitize-html` library, pinned, server only):

| Kept                                                                                                          | Removed                                                                                              |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| headings, paragraphs, lists, `blockquote`, `pre`/`code`, `kbd`, `sub`/`sup`, `mark`, `abbr`, `time`…          | `script`, `style`, `link`, `meta`, `base`                                                            |
| `div`, `section`, `figure`/`figcaption`, `details`/`summary`, tables (`colspan`, `rowspan`, `align`, `scope`) | forms, `input` (except task-list checkboxes), `button`, `select`, `textarea`                         |
| `img`, `picture`/`source`, `video`, `audio`, `track` from http(s) or site-relative sources                    | `object`, `embed`, SVG, MathML, any `iframe` other than the video embed                              |
| links to http(s), `mailto:`, `tel:` or relative targets (`target="_blank"` gets `rel="noopener noreferrer"`)  | `javascript:`, `data:` and every other scheme                                                        |
| `iframe` for `https://www.youtube-nocookie.com/embed/<id>`                                                    | event-handler attributes (`onclick`, `onerror`…)                                                     |
| `dir`, `lang`, `title`, `aria-label`, `aria-hidden`, `role`; `id` on headings                                 | `style` (except the highlighter's colours on `pre`/`span`), author `class`, `id` elsewhere, `data-*` |

The feed (`feed.xml`) carries the same HTML. The Markdown mirrors and `llms-full.txt` publish
the Markdown source; `sanitizeMarkdownHtml` reduces its raw HTML to the same subset and writes
any other tag as text (`&lt;script>`), leaving code blocks and inline code untouched. The
editor's preview still shows raw HTML escaped, as before.

## Contact form → leads

`submitContactAction` (public): zod validation, honeypot field `website`, 5 submissions per
10 minutes per IP, stores the lead (locale, source, IP, UA), notifies owners/admins
(`lead.new`). Budget values are range keys (`lt5`, `5to15`, `15to50`, `gt50`, `unknown`).

## Media storage

Files are written to `${DATA_DIR}/uploads/<id>-<safe-name>` (outside the web root). The type
is sniffed from magic bytes (SVG additionally requires an `.svg` name and an `<svg>` root),
whatever the upload route was told;
image dimensions come from PNG/JPEG/WebP/GIF headers (`image-size.ts`). `/media/<id>/<name>`
streams the file with the stored type, `X-Content-Type-Options: nosniff`, an ETag, immutable
caching for public files, single-range support (video), and
`Content-Security-Policy: …; sandbox` for SVG. Private files (`isPublic = false`) need a
session.

## Tools

`content_list_posts`, `content_get_post`, `content_create_post`, `content_update_post`,
`content_publish_post`, `content_delete_post` (destructive), `leads_list`,
`leads_update_status`, `media_list`. All admin-only.
