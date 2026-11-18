import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listMedia } from "@/server/modules/media/service";
import { panelContext } from "@/server/page-context";
import { MediaGrid, Uploader, type MediaRow } from "./_components/media-library";

const kinds = ["image", "pdf", "video"] as const;

/** The site's filter chip at panel size (the invoices status chips). */
const chip = (on: boolean) =>
  cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold whitespace-nowrap transition-colors",
    on
      ? "border-foreground bg-foreground text-background"
      : "border-frame-line bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
  );

/**
 * Media library (framed): the page box, then ONE library box — the upload
 * row (drop zone), the kind filter chips, and the files as cells of one
 * framed grid (1 / 2 / 3 / 4 columns) sharing hairlines.
 */
export default async function MediaPage({ searchParams }: PageProps<"/[locale]/panel/media">) {
  const { actor, t, href, fmt, locale } = await panelContext({ roles: ["owner", "admin"] });
  const sp = await searchParams;
  const kind = (kinds as readonly string[]).includes(String(sp.kind))
    ? (sp.kind as (typeof kinds)[number])
    : undefined;
  const items = listMedia(actor, { kind });
  const c = t.content;
  const size = (b: number) =>
    b > 1024 * 1024
      ? `${formatNumber(b / 1024 / 1024, locale, { maximumFractionDigits: 1 })} MB`
      : `${formatNumber(Math.max(1, Math.round(b / 1024)), locale)} KB`;
  const rows: MediaRow[] = items.map((m) => ({
    id: m.id,
    url: m.url,
    name: m.originalName,
    mime: m.mime,
    kind: m.kind,
    size: size(m.size),
    dims: m.width && m.height ? `${m.width}×${m.height}` : null,
    alt: m.alt,
    isPublic: m.isPublic,
    created: formatDate(m.createdAt, fmt),
  }));
  const tabs = [
    { k: undefined, label: t.common.all },
    { k: "image", label: c.filterImages },
    { k: "pdf", label: c.filterDocs },
    { k: "video", label: c.filterVideos },
  ] as const;
  return (
    <>
      <PageHeader
        title={c.mediaTitle}
        description={c.mediaSubtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: c.mediaTitle }]}
      />
      <FrameBox as="section" density="compact" ariaLabel={c.mediaTitle}>
        <FrameGrid cols={1}>
          <FrameCell>
            <Uploader />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="py-3">
            <nav
              aria-label={t.common.filter}
              className="-mx-1 flex max-w-[calc(100%+0.5rem)] scrollbar-thin gap-1.5 overflow-x-auto px-1 py-0.5"
            >
              {tabs.map((tb) => (
                <Link
                  key={tb.label}
                  href={href(`/panel/media${tb.k ? `?kind=${tb.k}` : ""}`)}
                  aria-current={tb.k === kind ? "page" : undefined}
                  className={chip(tb.k === kind)}
                >
                  {tb.label}
                </Link>
              ))}
            </nav>
          </FrameCell>
        </FrameGrid>
        {rows.length === 0 ? (
          <FrameGrid cols={1}>
            <FrameCell pad="none">
              <EmptyState icon={ImageIcon} title={c.mediaEmpty} description={c.mediaEmptyHint} />
            </FrameCell>
          </FrameGrid>
        ) : (
          <MediaGrid items={rows} />
        )}
      </FrameBox>
    </>
  );
}
