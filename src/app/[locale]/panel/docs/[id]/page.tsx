import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArchiveIcon,
  ChevronDownIcon,
  FolderKanbanIcon,
  ListIcon,
  PencilLineIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { DocActions } from "@/components/docs/doc-actions";
import { DocIconTile } from "@/components/docs/doc-icon-tile";
import { DocToc } from "@/components/docs/doc-toc";
import { VisibilityBadge } from "@/components/docs/visibility-badge";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import {
  FrameBox,
  FrameCell,
  FrameFiller,
  FrameGrid,
  HEADING_CLASS,
} from "@/components/shell/frame";
import { packRows } from "@/components/site/frame-plan";
import { format } from "@/i18n/format-message";
import { formatDateTime } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { isStaff } from "@/server/auth/actor";
import { AppError } from "@/server/errors";
import { getDoc } from "@/server/modules/docs/service";
import { panelContext } from "@/server/page-context";
import { DocsPagesBarSlot } from "../_components/pages-bar";

/**
 * Heading anchors inside .prose-gt pick up the link colour/underline from
 * globals.css; keep them looking like headings here. Print only the article
 * box (the panel chrome, the page box and the subpages stay on screen): its
 * frame, cell lines and markers drop out on paper.
 */
const PAGE_CSS = `.doc-prose :is(h1, h2, h3, h4) > a { color: inherit; text-decoration: none; }
.doc-prose :is(h1, h2, h3, h4) > a:hover { color: var(--primary-ink); }
@media print {
  body * { visibility: hidden !important; }
  #doc-print, #doc-print * { visibility: visible !important; }
  #doc-print { position: absolute; inset-block-start: 0; inset-inline: 0; margin: 0; border: 0 !important; }
  #doc-print::before, #doc-print::after,
  #doc-print .frame-cell::before, #doc-print .frame-cell::after { display: none !important; }
  #doc-print .frame-cell { border: 0 !important; }
}`;

/**
 * A doc page (framed): the page box (strip, crumbs through the ancestors,
 * icon + title, visibility/links/last edit, actions; an "archived" row when
 * archived), then the article box — the rendered markdown in a centred
 * reading column, the TOC as a collapsible row (a sticky side cell from lg) —
 * and the subpages as one framed grid.
 */
export default async function DocPage({ params }: PageProps<"/[locale]/panel/docs/[id]">) {
  const { id } = await params;
  const { actor, t, href, fmt } = await panelContext();
  const d = t.docs;
  const doc = await getDoc(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const { html, headings } = await renderMarkdown(doc.contentMd);
  const toc = headings.filter((h) => h.depth <= 3);
  const hasToc = toc.length >= 2;
  const staff = isStaff(actor);
  const hasContent = doc.contentMd.trim().length > 0;
  const edited = `${doc.updatedByName ? `${format(d.updatedBy, { name: doc.updatedByName })} · ` : ""}${formatDateTime(doc.updatedAt, fmt)}`;
  const childSpans = doc.children.map(() => undefined);

  return (
    <>
      <style>{PAGE_CSS}</style>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <DocIconTile icon={doc.icon} size="lg" />
            <bdi className="min-w-0 break-words">{doc.title}</bdi>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2 text-xs">
            {staff ? (
              <VisibilityBadge visibility={doc.visibility} t={d} />
            ) : (
              <Badge variant="neutral">{d.readOnly}</Badge>
            )}
            {doc.projectName && doc.projectId && (
              <Link href={href(`/panel/projects/${doc.projectId}`)}>
                <Badge variant="outline" className="hover:bg-accent">
                  <FolderKanbanIcon /> {doc.projectName}
                </Badge>
              </Link>
            )}
            {staff && doc.clientName && (
              <Badge variant="outline">
                <UsersIcon /> {doc.clientName}
              </Badge>
            )}
            <span>{edited}</span>
          </span>
        }
        crumbs={[
          { label: d.title, href: href("/panel/docs") },
          ...doc.ancestors.map((a) => ({
            label: `${a.icon ? `${a.icon} ` : ""}${a.title}`,
            href: href(`/panel/docs/${a.id}`),
          })),
          { label: doc.title },
        ]}
        path={["DOCS", "PAGE"]}
        actions={
          <DocActions
            id={doc.id}
            parentId={doc.parentId}
            archived={!!doc.archivedAt}
            canEdit={doc.canEdit}
            canManage={doc.canManage}
          />
        }
      >
        {doc.archivedAt && (
          <FrameGrid cols={1}>
            <FrameCell className="flex items-center gap-2 bg-warning/10 py-3 text-sm font-semibold text-warning-ink">
              <ArchiveIcon className="size-4 shrink-0" />
              {format(d.archivedOn, { date: formatDateTime(doc.archivedAt, fmt) })}
            </FrameCell>
          </FrameGrid>
        )}
      </PageHeader>
      <DocsPagesBarSlot actor={actor} />

      <div className="flex flex-col gap-6 lg:gap-8">
        <FrameBox as="article" id="doc-print" density="compact" ariaLabel={doc.title}>
          <FrameGrid cols={1} className={hasToc ? "lg:grid-cols-[minmax(0,1fr)_15rem]" : undefined}>
            <FrameCell pad="none">
              {hasToc && (
                <details className="group/toc border-b border-frame-line lg:hidden print:hidden">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-(--cell-pad) py-3 text-sm font-semibold transition-colors hover:bg-card [&::-webkit-details-marker]:hidden">
                    <ListIcon className="size-4 text-muted-foreground" /> {d.onThisPage}
                    <ChevronDownIcon className="ms-auto size-4 text-muted-foreground transition-transform group-open/toc:rotate-180" />
                  </summary>
                  <DocToc headings={toc} className="px-(--cell-pad) pb-4" />
                </details>
              )}
              {/* on paper the page box is gone: the article repeats the title */}
              <p className="hidden px-(--cell-pad) pt-8 text-2xl font-extrabold print:block">
                {doc.icon ? `${doc.icon} ` : ""}
                <bdi>{doc.title}</bdi>
              </p>
              <div className="px-(--cell-pad) py-8 sm:px-10 sm:py-10">
                {hasContent ? (
                  <div
                    className="prose-gt doc-prose mx-auto max-w-3xl"
                    dir="auto"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <EmptyState
                    icon={PencilLineIcon}
                    title={doc.canEdit ? d.emptyPage : d.emptyPageClient}
                    description={doc.canEdit ? d.emptyPageHint : undefined}
                    action={
                      doc.canEdit && (
                        <Button asChild>
                          <Link href={href(`/panel/docs/${doc.id}/edit`)}>{t.common.edit}</Link>
                        </Button>
                      )
                    }
                  />
                )}
              </div>
            </FrameCell>
            {hasToc && (
              <FrameCell as="aside" className="hidden lg:block print:hidden">
                <div className="sticky below-chrome">
                  <DocToc headings={toc} />
                </div>
              </FrameCell>
            )}
          </FrameGrid>
        </FrameBox>

        {doc.children.length > 0 && (
          <FrameBox
            as="section"
            density="compact"
            labelledBy="doc-subpages"
            className="print:hidden"
          >
            <FrameGrid cols={1}>
              <FrameCell pad="none">
                <CardHeader>
                  <h2 id="doc-subpages" className={HEADING_CLASS.box}>
                    {d.subpages}
                  </h2>
                </CardHeader>
                <FrameGrid cols={2}>
                  {doc.children.map((c) => (
                    <FrameCell key={c.id} hover className="group flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <DocIconTile icon={c.icon} />
                        <Link
                          href={href(`/panel/docs/${c.id}`)}
                          className="truncate font-bold group-hover:text-primary-ink after:absolute after:inset-0"
                        >
                          <bdi>{c.title}</bdi>
                        </Link>
                      </div>
                      {c.excerpt && (
                        <p
                          className="line-clamp-2 text-xs leading-5 text-muted-foreground"
                          dir="auto"
                        >
                          {c.excerpt}
                        </p>
                      )}
                    </FrameCell>
                  ))}
                  <FrameFiller
                    units={{
                      md: packRows(childSpans, 2, "md").trailing,
                      lg: packRows(childSpans, 2, "lg").trailing,
                    }}
                  />
                </FrameGrid>
              </FrameCell>
            </FrameGrid>
          </FrameBox>
        )}
      </div>
    </>
  );
}
