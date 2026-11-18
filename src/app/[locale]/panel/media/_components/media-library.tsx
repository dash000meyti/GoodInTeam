"use client";

import { useRef, useState, useTransition } from "react";
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  FilmIcon,
  Loader2Icon,
  LockIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction } from "@/components/shared/use-action-form";
import { FrameCell, FrameGrid } from "@/components/shell/frame";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  deleteMediaAction,
  updateMediaAction,
  uploadMediaAction,
} from "@/server/modules/media/actions";

export interface MediaRow {
  id: string;
  url: string;
  name: string;
  mime: string;
  kind: "image" | "pdf" | "video";
  size: string;
  dims: string | null;
  alt: string | null;
  isPublic: boolean;
  created: string;
}

const MAX = 20 * 1024 * 1024;

export function Uploader() {
  const t = useT();
  const c = t.content;
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [pending, start] = useTransition();
  const upload = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const tooBig = list.find((f) => f.size > MAX);
    if (tooBig) {
      toast.error(`${tooBig.name}: ${c.uploadHint}`);
      return;
    }
    start(async () => {
      const fd = new FormData();
      for (const f of list) fd.append("file", f);
      const res = await uploadMediaAction(fd);
      if (res.ok) {
        const dup = res.data.filter((d) => d.duplicate).length;
        toast.success(dup ? `${c.uploaded} · ${c.duplicate}` : c.uploaded);
      } else {
        toast.error(res.error.message);
      }
      if (input.current) input.current.value = "";
    });
  };
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        upload(e.dataTransfer.files);
      }}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-frame-line bg-card px-6 py-8 text-center transition-colors hover:border-foreground/40 has-focus-visible:border-foreground",
        drag && "border-foreground bg-primary/8",
      )}
    >
      <input
        ref={input}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml,application/pdf,video/mp4"
        className="sr-only"
        onChange={(e) => e.target.files && upload(e.target.files)}
        disabled={pending}
      />
      <span
        className={cn(
          "mb-1 flex size-14 items-center justify-center border border-frame-line bg-background bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px] text-muted-foreground transition-colors group-hover:text-foreground",
          drag && "border-[var(--primary-dark)] bg-primary text-primary-foreground",
        )}
      >
        {pending ? (
          <Loader2Icon className="size-6 animate-spin" />
        ) : (
          <UploadCloudIcon className="size-6" />
        )}
      </span>
      <span className="font-bold">{pending ? c.uploading : c.dropHere}</span>
      <span className="text-xs text-muted-foreground">{c.uploadHint}</span>
    </label>
  );
}

function AltEditor({ item }: { item: MediaRow }) {
  const t = useT();
  const [alt, setAlt] = useState(item.alt ?? "");
  const { exec, pending } = useAction();
  return (
    <form
      className="flex gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        exec(updateMediaAction({ id: item.id, alt }), t.common.saved);
      }}
    >
      <Input
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        placeholder={t.content.altText}
        aria-label={t.content.altText}
        className="h-8 text-xs"
        dir="auto"
      />
      <Button
        size="icon-sm"
        variant="outline"
        type="submit"
        disabled={pending || alt === (item.alt ?? "")}
        aria-label={t.common.save}
      >
        <CheckIcon />
      </Button>
    </form>
  );
}

function CopyUrl({ url }: { url: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={t.content.copyUrl}
      onClick={async () => {
        await navigator.clipboard.writeText(new URL(url, window.location.origin).toString());
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <CheckIcon className="text-success-ink" /> : <CopyIcon />}
    </Button>
  );
}

/** Filler cells per breakpoint (md 2, lg 3, xl 4 columns); literal classes for Tailwind. */
const FILLER: Record<string, string> = {
  "100": "hidden md:block lg:hidden",
  "010": "hidden lg:block xl:hidden",
  "001": "hidden xl:block",
  "110": "hidden md:block xl:hidden",
  "101": "hidden md:block lg:hidden xl:block",
  "011": "hidden lg:block",
  "111": "hidden md:block",
};
const trailing = (n: number, cols: number) => (cols - (n % cols)) % cols;

/**
 * The library's files as cells of ONE framed grid (1 / 2 / 3 / 4 columns),
 * sharing the box's hairlines: thumbnail edge to edge, then name, type,
 * size and the actions; dots fillers complete the last row.
 */
export function MediaGrid({ items }: { items: MediaRow[] }) {
  const t = useT();
  const c = t.content;
  const { exec } = useAction();
  const units = {
    md: trailing(items.length, 2),
    lg: trailing(items.length, 3),
    xl: trailing(items.length, 4),
  };
  return (
    <FrameGrid cols={3} className="xl:grid-cols-4">
      {items.map((m) => (
        <FrameCell key={m.id} as="figure" pad="none" className="flex flex-col">
          <a
            href={m.url}
            target="_blank"
            rel="noopener"
            className="relative block aspect-[4/3] shrink-0 overflow-hidden border-b border-frame-line bg-card bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px]"
          >
            {m.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- library thumbnails (any type incl. SVG)
              <img
                src={m.url}
                alt={m.alt ?? ""}
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                {m.kind === "pdf" ? (
                  <FileTextIcon className="size-10" strokeWidth={1.5} />
                ) : (
                  <FilmIcon className="size-10" strokeWidth={1.5} />
                )}
              </span>
            )}
            {!m.isPublic && (
              <Badge variant="neutral" className="absolute start-2 top-2">
                <LockIcon /> {c.private}
              </Badge>
            )}
          </a>
          <figcaption className="flex flex-1 flex-col gap-2.5 p-3">
            <div className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" dir="ltr" title={m.name}>
                  {m.name}
                </p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {[m.mime.split("/")[1]?.toUpperCase(), m.size, m.dims]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <CopyUrl url={m.url} />
              <ConfirmDialog
                title={c.deleteMedia}
                description={c.deleteMediaBody}
                onConfirm={() => exec(deleteMediaAction({ id: m.id }), t.common.delete)}
                trigger={
                  <Button size="icon-sm" variant="ghost" aria-label={c.deleteMedia}>
                    <Trash2Icon className="text-destructive" />
                  </Button>
                }
              />
            </div>
            {m.kind === "image" && <AltEditor item={m} />}
          </figcaption>
        </FrameCell>
      ))}
      {Array.from({ length: Math.max(units.md, units.lg, units.xl) }, (_, i) => (
        <FrameCell
          key={`filler-${i}`}
          tone="dots"
          aria-hidden
          className={FILLER[`${+(i < units.md)}${+(i < units.lg)}${+(i < units.xl)}`]}
        />
      ))}
    </FrameGrid>
  );
}
