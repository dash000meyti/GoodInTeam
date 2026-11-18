# Module: Docs (knowledge base)

A tree of markdown pages for team knowledge and project documentation, optionally shared with
clients in their portal.

## Files

```
src/server/modules/docs/{schemas,service,actions,tools}.ts
src/server/modules/docs/tree.ts (+ tree.test.ts)     pure helpers: tree, snippets, normalization
src/app/[locale]/panel/docs/
  layout.tsx                 page tree box from xl (streams in) + current page
  page.tsx                   home: counters, recent pages, sections · search results (?q=) · portal view
  [id]/page.tsx              page view (breadcrumbs, markdown, TOC, subpages, print)
  [id]/edit/page.tsx         editor
  new/page.tsx               editor for a new page (?parentId=, ?projectId=)
  archive/page.tsx           archived pages (restore / delete)
  */loading.tsx              per-segment skeletons (instant navigations)
  _components/pages-bar.tsx  docTreeItems() + <DocsPagesBarSlot> (the tree's toolbar box below xl)
  _components/docs-skeletons.tsx   loading states, box for box with the pages
  _components/project-docs-panel.tsx   <ProjectDocsPanel projectId ctx clientView /> for the project page
src/components/docs/          sidebar tree + toolbar box, editor, emoji picker, TOC, actions, badges,
                              DocIconTile (emoji on a square hairline tile)
src/i18n/messages/{fa,en}/docs.ts
```

## Visibility

| `visibility` | Who can read                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `private`    | only the author (`created_by`) — admins and the owner included                                                                                                 |
| `team`       | all staff (owner, admin, member)                                                                                                                               |
| `client`     | all staff + portal users of the **linked client** (`client_id`), or of the linked **project's** client when that project has `portal_enabled` and `share_docs` |

`docAccessWhere(actor)` in the service is the single SQL filter used by every query. Portal users
never see archived pages and get a read-only UI. A `client` page must be linked to a project or a
client (validated). An explicit `client_id` link shares the page with that client even when the
project's `share_docs` is off (the editor warns about it).

Permissions: staff can create pages and edit any page they can read. Changing visibility,
archiving and deleting are limited to the **author or an admin**. Linking a client is admin-only
(client records are admin data); members can link projects they are assigned to.

## Tree

- `parent_id` nests pages; `sort` (real) orders siblings. Pages whose parent isn't visible to the
  viewer are shown at the top level.
- Sidebar: expand/collapse (remembered per browser), ancestors of the open page auto-expand, filter
  (all / team / client-shared / private / per project), "+" to add a subpage, menu with move up /
  move down / move into the page above / move out, and **drag & drop** (top/bottom quarter = before /
  after, middle = nest inside). `moveDoc` places the page at an index among its new siblings using
  midpoints and renumbers siblings when they get too close. Cycles are rejected.
- Archiving or deleting a page moves its subpages **up to its parent** (kept in place). Restoring a
  page whose parent is gone puts it at the top level.

## Search

`searchDocs` runs a `LIKE` over title and markdown with wildcards escaped, case-insensitive for
Latin text and normalising Arabic ي/ى/ك/ة to Persian ی/ک/ه on both sides. Title hits rank first.
Snippets are built from plain text (`markdownToText`) around the first match with `[start, end)`
ranges for `<mark>` highlighting.

## Layout (framed)

The pages speak the panel's frame language (docs/design-system.md "Frame", "Panel density"):

- **Tree**: from xl a sticky framed box beside the page (header + "new page", search + filter, the
  scrolling tree, archive — rows sharing hairlines; the open page gets an ink bar on its start
  edge). Below xl every page renders the tree's **toolbar box** (pages drawer + search) right
  under its page box (`DocsPagesBarSlot`; the editor takes it as `pagesBar`), so the page box stays
  first and keeps the full width for its title, actions and decor.
- **Home**: the counters are the page box's second row; one box holds "Recently updated" (rows)
  and "Sections" (top-level pages as one framed grid). Search results, the archive and the portal
  view are one box each.
- **Page**: the page box (strip `DOCS/PAGE`, crumbs, icon tile + title, badges, actions; an
  "archived" row), the article box (markdown in a centred `.prose-gt` column, max 48rem), the
  subpages as one framed grid.
- **Editor**: one box — editor cell (emoji + title row, markdown edge to edge) and the sticky
  page-settings cell share a hairline from lg.

## Page view & editor

- View: breadcrumbs (visible ancestors), emoji icon + title, visibility badge, project/client
  links, "last edited by", rendered markdown (`renderMarkdown`, Shiki, raw HTML escaped), an
  "On this page" TOC from the rendered headings (a sticky side cell with scroll-spy from lg, a
  collapsible row above the article otherwise), subpages, copy link, print (CSS prints only the
  article box, without its frame).
- Editor: title, emoji picker, `MarkdownEditor` with server preview, visibility cards, parent page
  (excluding the page and its subtree), project and client selects, `Ctrl/⌘+S`, unsaved-changes
  guard, sticky framed save bar on phones. While typing, a **draft** is saved to `localStorage`
  (`gt-doc-draft:<id|new>`, debounced); on the next visit a differing draft triggers a
  "restore draft?" row at the top of the editor box. Saving or cancelling clears it.
- New subpages inherit the parent's visibility and links; pages created from a project default to
  `team` and are linked to that project; other new pages start `private`.

## Project page integration

```tsx
import { ProjectDocsPanel } from "@/app/[locale]/panel/docs/_components/project-docs-panel";
<ProjectDocsPanel projectId={project.id} ctx={ctx} clientView={!isStaff(ctx.actor)} />;
```

Lists the project's pages nested (respecting visibility; `clientView` limits the list to `client`
pages and hides staff UI) with a "new page for this project" shortcut for staff.

## Tools

`docs_list` (tree or flat; `projectId`, `visibility`, `archived` filters), `docs_get` (markdown +
breadcrumbs + children), `docs_search` (snippets), `docs_create`, `docs_update`, `docs_delete`
(destructive; subpages move up). Portal users can use the read tools and only get `client` pages.

`docs_update` (and the editor's save) is a true partial update: only the fields that are sent
change. A title-only call keeps the body and the visibility; `""` / `null` clears the icon, the
parent and the links. `updateDocInput` and `docInput` derive from one default-free `docFields`
shape, so the create defaults (empty body, `private`) never apply to an update — that is what lets
a member save an edit to a colleague's `team` page: the editor sends no `visibility` for a page the
user can't manage, and the server no longer reads the missing key as a change to `private`.
