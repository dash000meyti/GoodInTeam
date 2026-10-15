import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listMedia } from "@/server/modules/media/service";
import { panelContext } from "@/server/page-context";
import { MediaGrid, Uploader, type MediaRow } from "./_components/media-library";

const kinds = ["image", "pdf", "video"] as const;

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
      <Uploader />
      <div className="mb-5 flex gap-2">
        {tabs.map((tb) => (
          <Link
            key={tb.label}
            href={href(`/panel/media${tb.k ? `?kind=${tb.k}` : ""}`)}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors",
              tb.k === kind
                ? "border-transparent bg-grey-800 text-white dark:bg-white dark:text-grey-800"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {tb.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={ImageIcon} title={c.mediaEmpty} description={c.mediaEmptyHint} />
      ) : (
        <MediaGrid items={rows} />
      )}
    </>
  );
}
