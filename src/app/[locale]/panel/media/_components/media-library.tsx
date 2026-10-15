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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction } from "@/components/shared/use-action-form";
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
        "mb-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]",
        drag && "border-primary bg-primary/5",
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
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
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
      {done ? <CheckIcon className="text-success" /> : <CopyIcon />}
    </Button>
  );
}

export function MediaGrid({ items }: { items: MediaRow[] }) {
  const t = useT();
  const c = t.content;
  const { exec } = useAction();
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((m) => (
        <Card key={m.id} className="gap-0 overflow-hidden py-0">
          <a
            href={m.url}
            target="_blank"
            rel="noopener"
            className="relative block aspect-[4/3] bg-muted"
          >
            {m.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- library thumbnails (any type incl. SVG)
              <img
                src={m.url}
                alt={m.alt ?? ""}
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                {m.kind === "pdf" ? (
                  <FileTextIcon className="size-10" />
                ) : (
                  <FilmIcon className="size-10" />
                )}
              </span>
            )}
            {!m.isPublic && (
              <Badge variant="neutral" className="absolute start-2 top-2">
                <LockIcon /> {c.private}
              </Badge>
            )}
          </a>
          <div className="space-y-2.5 p-3">
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
          </div>
        </Card>
      ))}
    </div>
  );
}
