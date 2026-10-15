import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArchiveIcon,
  FileTextIcon,
  FolderKanbanIcon,
  PencilLineIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocActions } from "@/components/docs/doc-actions";
import { DocToc } from "@/components/docs/doc-toc";
import { VisibilityBadge } from "@/components/docs/visibility-badge";
import { EmptyState } from "@/components/panel/empty-state";
import { format } from "@/i18n/format-message";
import { formatDateTime } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { isStaff } from "@/server/auth/actor";
import { AppError } from "@/server/errors";
import { getDoc } from "@/server/modules/docs/service";
import { panelContext } from "@/server/page-context";

/**
 * Heading anchors inside .prose-gt pick up the link colour/underline from
 * globals.css; keep them looking like headings here. Print only the article
 * (hide panel chrome, sidebars and actions).
 */
const PAGE_CSS = `.doc-prose :is(h1, h2, h3, h4) > a { color: inherit; text-decoration: none; }
.doc-prose :is(h1, h2, h3, h4) > a:hover { color: var(--primary); }
@media print {
  body * { visibility: hidden !important; }
  #doc-print, #doc-print * { visibility: visible !important; }
  #doc-print { position: absolute; inset-block-start: 0; inset-inline: 0; margin: 0; }
  #doc-print [data-slot="card"] { box-shadow: none !important; border: 0 !important; padding: 0 !important; }
}`;

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
  const staff = isStaff(actor);
  const hasContent = doc.contentMd.trim().length > 0;

  return (
    <article id="doc-print" className="space-y-6">
      <style>{PAGE_CSS}</style>

      <nav
        aria-label="breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href={href("/panel/docs")} className="hover:text-foreground hover:underline">
          {d.title}
        </Link>
        {doc.ancestors.map((a) => (
          <span key={a.id} className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-grey-500" />
            <Link
              href={href(`/panel/docs/${a.id}`)}
              className="hover:text-foreground hover:underline"
            >
              {a.icon ? `${a.icon} ` : ""}
              <bdi>{a.title}</bdi>
            </Link>
          </span>
        ))}
        <span className="flex items-center gap-2">
          <span className="size-1 rounded-full bg-grey-500" />
          <span className="text-foreground/70">
            <bdi>{doc.title}</bdi>
          </span>
        </span>
      </nav>

      {doc.archivedAt && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/12 px-4 py-3 text-sm font-medium text-[#7a4100] dark:text-warning print:hidden">
          <ArchiveIcon className="size-4" />
          {format(d.archivedOn, { date: formatDateTime(doc.archivedAt, fmt) })}
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-4xl leading-none">
            {doc.icon ?? <FileTextIcon className="size-7 text-muted-foreground" />}
          </span>
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight break-words sm:text-3xl">
              <bdi>{doc.title}</bdi>
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {staff ? (
                <VisibilityBadge visibility={doc.visibility} t={d} />
              ) : (
                <Badge variant="neutral">{d.readOnly}</Badge>
              )}
              {doc.projectName &&
                (doc.projectId ? (
                  <Link href={href(`/panel/projects/${doc.projectId}`)}>
                    <Badge variant="outline" className="hover:bg-accent">
                      <FolderKanbanIcon /> {doc.projectName}
                    </Badge>
                  </Link>
                ) : null)}
              {staff && doc.clientName && (
                <Badge variant="outline">
                  <UsersIcon /> {doc.clientName}
                </Badge>
              )}
              <span>
                {doc.updatedByName ? `${format(d.updatedBy, { name: doc.updatedByName })} · ` : ""}
                {formatDateTime(doc.updatedAt, fmt)}
              </span>
            </div>
          </div>
        </div>
        <DocActions
          id={doc.id}
          parentId={doc.parentId}
          archived={!!doc.archivedAt}
          canEdit={doc.canEdit}
          canManage={doc.canManage}
        />
      </header>

      {toc.length >= 2 && (
        <details className="rounded-xl border border-dashed px-4 py-3 2xl:hidden print:hidden">
          <summary className="cursor-pointer text-sm font-semibold">{d.onThisPage}</summary>
          <DocToc headings={toc} className="mt-3" />
        </details>
      )}

      <div className={cn("grid gap-8", toc.length >= 2 && "2xl:grid-cols-[minmax(0,1fr)_13rem]")}>
        <Card className="p-6 sm:p-10">
          {hasContent ? (
            <div
              className="prose-gt doc-prose"
              dir="auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <EmptyState
              icon={PencilLineIcon}
              title={doc.canEdit ? d.emptyPage : d.emptyPageClient}
              description={doc.canEdit ? d.emptyPageHint : undefined}
              className="border-0 bg-transparent"
              action={
                doc.canEdit && (
                  <Button asChild>
                    <Link href={href(`/panel/docs/${doc.id}/edit`)}>{t.common.edit}</Link>
                  </Button>
                )
              }
            />
          )}
        </Card>
        {toc.length >= 2 && (
          <aside className="hidden 2xl:block print:hidden">
            <div className="sticky top-24">
              <DocToc headings={toc} />
            </div>
          </aside>
        )}
      </div>

      {doc.children.length > 0 && (
        <section className="space-y-3 print:hidden">
          <h2 className="text-sm font-bold text-muted-foreground">{d.subpages}</h2>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {doc.children.map((c) => (
              <Link key={c.id} href={href(`/panel/docs/${c.id}`)} className="group">
                <Card className="h-full gap-2 p-5 transition-shadow group-hover:shadow-dropdown">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{c.icon ?? "📄"}</span>
                    <span className="truncate font-bold group-hover:text-primary">
                      <bdi>{c.title}</bdi>
                    </span>
                  </div>
                  {c.excerpt && (
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground" dir="auto">
                      {c.excerpt}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
