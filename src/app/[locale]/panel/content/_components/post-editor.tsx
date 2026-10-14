"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  ImageIcon,
  LanguagesIcon,
  Loader2Icon,
  PlusIcon,
  RocketIcon,
  Share2Icon,
  Trash2Icon,
  TriangleAlertIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { DatePicker } from "@/components/shared/date-picker";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { SelectField } from "@/components/shared/select-field";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { format } from "@/i18n/format-message";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { contentTypes, postPath, SEO_LIMITS } from "@/lib/content";
import { cn, slugify } from "@/lib/utils";
import {
  checkSlugAction,
  createTranslationAction,
  deletePostAction,
  savePostAction,
  setPostStatusAction,
  upsertSyndicationAction,
} from "@/server/modules/content/actions";
import { listMediaAction } from "@/server/modules/media/actions";
import type { EditorContext, EditorPost } from "./editor-types";
import { postStatusVariant } from "./status-badge";

// ─── Small helpers ──────────────────────────────────────────────────────────

/** Mirrors `socialNetworks` in the schema (kept local: no server imports in client code). */
const NETWORKS = [
  "x",
  "linkedin",
  "telegram",
  "instagram",
  "mastodon",
  "bluesky",
  "threads",
  "youtube",
] as const;

function Counter({ n, max }: { n: number; max: number }) {
  const t = useT();
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        n > max
          ? "font-bold text-destructive"
          : n > max * 0.85
            ? "text-warning"
            : "text-muted-foreground",
      )}
    >
      {format(t.content.charCount, { n, max })}
    </span>
  );
}

function TagsInput({
  value,
  onChange,
  placeholder,
  ltr,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  ltr?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...new Set([...value, ...parts])].slice(0, 30));
    setDraft("");
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 focus-within:border-foreground">
      {value.map((tag) => (
        <span
          key={tag}
          dir={ltr ? "ltr" : "auto"}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold"
        >
          {tag}
          <button
            type="button"
            aria-label="remove"
            onClick={() => onChange(value.filter((x) => x !== tag))}
            className="cursor-pointer text-muted-foreground hover:text-destructive"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        dir={ltr ? "ltr" : "auto"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === "،") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length ? undefined : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function MediaPicker({ onPick }: { onPick: (m: { url: string; alt: string | null }) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<
    { id: string; url: string; alt: string | null; name: string }[] | null
  >(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!open || items) return;
    start(async () => {
      const res = await listMediaAction({});
      setItems(res.ok ? res.data : []);
    });
  }, [open, items]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ImageIcon /> {t.content.pickFromLibrary}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.content.pickFromLibrary}</DialogTitle>
        </DialogHeader>
        {pending || !items ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t.content.noMediaYet}</p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onPick({ url: m.url, alt: m.alt });
                  setOpen(false);
                }}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-border bg-muted hover:ring-2 hover:ring-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails of uploads */}
                <img
                  src={m.url}
                  alt={m.alt ?? ""}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-[11px] text-white">
                  {m.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Editor ─────────────────────────────────────────────────────────────────

export function PostEditor({ initial, ctx }: { initial: EditorPost; ctx: EditorContext }) {
  const t = useT();
  const c = t.content;
  const uiLocale = useLocale();
  const router = useRouter();
  const [v, setV] = useState<EditorPost>(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [slugState, setSlugState] = useState<{ available: boolean; suggestion: string } | null>(
    null,
  );
  const set = <K extends keyof EditorPost>(k: K, val: EditorPost[K]) =>
    setV((p) => ({ ...p, [k]: val }));
  const setMeta = <K extends keyof EditorPost["meta"]>(k: K, val: EditorPost["meta"][K]) =>
    setV((p) => ({ ...p, meta: { ...p.meta, [k]: val } }));
  const { exec, pending: acting } = useAction();

  const form = useActionForm(savePostAction, {
    successMessage: t.common.saved,
    onSuccess: (data) => {
      if (!initial.id) router.replace(localePath(uiLocale, `/panel/content/${data.id}`));
      else router.refresh();
    },
  });

  // Debounced availability check.
  const checkSeq = useRef(0);
  useEffect(() => {
    const slug = v.slug.trim();
    if (!slug) return;
    const seq = ++checkSeq.current;
    const h = setTimeout(async () => {
      const res = await checkSlugAction({
        type: v.type,
        locale: v.locale,
        slug,
        excludeId: initial.id,
      });
      if (res.ok && seq === checkSeq.current)
        setSlugState({ available: res.data.available, suggestion: res.data.suggestion });
    }, 400);
    return () => clearTimeout(h);
  }, [v.slug, v.type, v.locale, initial.id]);

  const series = ctx.series.filter((s) => s.locale === v.locale);
  const urlPath = localePath(
    v.locale,
    postPath({ type: v.type, slug: v.slug || "…", seriesSlug: null }),
  );
  const seoTitle = v.seoTitle || v.title;
  const seoDesc = v.seoDescription || v.excerpt;
  const futureDate = useMemo(() => {
    if (!v.publishedDate) return false;
    return new Date(`${v.publishedDate}T${v.publishedTime || "00:00"}`).getTime() > ctx.now;
  }, [v.publishedDate, v.publishedTime, ctx.now]);

  const payload = (status?: EditorPost["status"]) => ({
    id: v.id,
    type: v.type,
    locale: v.locale,
    title: v.title,
    slug: v.slug,
    excerpt: v.excerpt,
    contentMd: v.contentMd,
    coverUrl: v.coverUrl,
    coverAlt: v.coverAlt,
    videoUrl: v.videoUrl,
    status: status ?? v.status,
    publishedDate: v.publishedDate,
    publishedTime: v.publishedTime,
    featured: v.featured,
    seriesId: v.type === "tutorial" ? v.seriesId : "",
    seriesOrder: v.seriesOrder,
    projectId: v.projectId,
    tags: v.tags,
    seoTitle: v.seoTitle,
    seoDescription: v.seoDescription,
    sort: v.sort,
    meta: {
      client: v.meta.client,
      year: v.meta.year,
      role: v.meta.role,
      stack: v.meta.stack,
      liveUrl: v.meta.liveUrl,
      repoUrl: v.meta.repoUrl,
      gallery: v.meta.gallery,
      metrics: v.meta.metrics.filter((m) => m.label.trim() && m.value.trim()),
      icon: v.meta.icon,
      faq: v.meta.faq.filter((f) => f.q.trim() && f.a.trim()),
    },
  });

  const save = (status?: EditorPost["status"]) => {
    if (status) set("status", status);
    void form.run(payload(status) as unknown as Record<string, unknown>);
  };
  const err = (k: string) => {
    const e = form.errors[k]?.[0];
    return e === "slug_taken" ? c.slugTaken : e;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      {/* ── Main column ── */}
      <div className="min-w-0 space-y-6">
        <Card>
          <CardContent className="space-y-5">
            <Field label={c.fieldTitle} error={err("title")} required>
              <Input
                value={v.title}
                onChange={(e) => {
                  const title = e.target.value;
                  // Auto-slug from the title until the slug is edited by hand.
                  setV((p) => ({ ...p, title, slug: slugTouched ? p.slug : slugify(title) }));
                }}
                className="h-12 text-lg font-bold"
                dir="auto"
                required
                autoFocus={!initial.id}
              />
            </Field>
            <Field
              label={c.fieldSlug}
              error={err("slug")}
              hint={
                slugState && v.slug ? (
                  slugState.available ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2Icon className="size-3.5" /> {c.slugAvailable}
                    </span>
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-1 text-warning">
                      <TriangleAlertIcon className="size-3.5" /> {c.slugTaken}{" "}
                      <button
                        type="button"
                        className="cursor-pointer font-semibold underline"
                        onClick={() => {
                          setSlugTouched(true);
                          set("slug", slugState.suggestion);
                        }}
                      >
                        {format(c.slugSuggestion, { slug: slugState.suggestion })}
                      </button>
                    </span>
                  )
                ) : (
                  c.slugHint
                )
              }
            >
              <div
                className="flex items-center rounded-lg border border-input focus-within:border-foreground"
                dir="ltr"
              >
                <span className="max-w-[45%] truncate ps-3 font-mono text-xs text-muted-foreground">
                  {ctx.siteUrl.replace(/^https?:\/\//, "")}
                  {urlPath.slice(0, urlPath.lastIndexOf("/") + 1)}
                </span>
                <input
                  value={v.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.replace(/\s+/g, "-"));
                  }}
                  className="h-10 min-w-0 flex-1 bg-transparent pe-3 font-mono text-sm outline-none"
                  dir="auto"
                />
              </div>
            </Field>
            <Field
              label={
                <span className="flex w-full items-center justify-between">
                  {c.fieldExcerpt} <Counter n={v.excerpt.length} max={300} />
                </span>
              }
              hint={c.excerptHint}
              error={err("excerpt")}
            >
              <Textarea
                value={v.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                rows={3}
                dir="auto"
              />
            </Field>
            <Field label={c.fieldContent} hint={c.contentHtmlNote} error={err("contentMd")}>
              <MarkdownEditor
                value={v.contentMd}
                onChange={(x) => set("contentMd", x)}
                rows={22}
                dir="auto"
              />
            </Field>
            {initial.readingMinutes ? (
              <p className="text-xs text-muted-foreground">
                {format(c.readingTime, { n: initial.readingMinutes })}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {v.type === "work" && (
          <Card>
            <CardHeader>
              <CardTitle>{c.workCard}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label={c.metaClient}>
                <Input value={v.meta.client} onChange={(e) => setMeta("client", e.target.value)} />
              </Field>
              <Field label={c.metaYear} error={err("meta")}>
                <Input
                  value={v.meta.year}
                  onChange={(e) =>
                    setMeta("year", e.target.value.replace(/[^\d]/g, "").slice(0, 4))
                  }
                  inputMode="numeric"
                  dir="ltr"
                />
              </Field>
              <Field label={c.metaRole} className="sm:col-span-2">
                <Input value={v.meta.role} onChange={(e) => setMeta("role", e.target.value)} />
              </Field>
              <Field label={c.metaStack} hint={c.tagsHint} className="sm:col-span-2">
                <TagsInput value={v.meta.stack} onChange={(x) => setMeta("stack", x)} ltr />
              </Field>
              <Field label={c.metaLiveUrl}>
                <Input
                  value={v.meta.liveUrl}
                  onChange={(e) => setMeta("liveUrl", e.target.value)}
                  dir="ltr"
                />
              </Field>
              <Field label={c.metaRepoUrl}>
                <Input
                  value={v.meta.repoUrl}
                  onChange={(e) => setMeta("repoUrl", e.target.value)}
                  dir="ltr"
                />
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-semibold">{c.metaMetrics}</p>
                {v.meta.metrics.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={m.value}
                      placeholder={c.metricValue}
                      className="w-36"
                      onChange={(e) =>
                        setMeta(
                          "metrics",
                          v.meta.metrics.map((x, j) =>
                            j === i ? { ...x, value: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Input
                      value={m.label}
                      placeholder={c.metricLabel}
                      onChange={(e) =>
                        setMeta(
                          "metrics",
                          v.meta.metrics.map((x, j) =>
                            j === i ? { ...x, label: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t.common.delete}
                      onClick={() =>
                        setMeta(
                          "metrics",
                          v.meta.metrics.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
                {v.meta.metrics.length < 8 && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={() =>
                      setMeta("metrics", [...v.meta.metrics, { label: "", value: "" }])
                    }
                  >
                    <PlusIcon /> {c.addMetric}
                  </Button>
                )}
              </div>
              <Field label={c.metaGallery} hint={c.galleryHint} className="sm:col-span-2">
                <Textarea
                  value={v.meta.gallery.join("\n")}
                  onChange={(e) => setMeta("gallery", e.target.value.split("\n"))}
                  onBlur={() =>
                    setMeta("gallery", v.meta.gallery.map((x) => x.trim()).filter(Boolean))
                  }
                  rows={3}
                  dir="ltr"
                  className="font-mono text-xs"
                />
              </Field>
              <Field label={c.linkedProject} className="sm:col-span-2">
                <SelectField
                  value={v.projectId}
                  onChange={(x) => set("projectId", x)}
                  noneLabel={c.noProject}
                  placeholder={c.noProject}
                  options={ctx.projects.map((p) => ({ value: p.id, label: p.name }))}
                />
              </Field>
            </CardContent>
          </Card>
        )}

        {v.type === "service" && (
          <Card>
            <CardHeader>
              <CardTitle>{c.serviceCard}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label={c.serviceIcon}>
                <SelectField
                  value={v.meta.icon}
                  onChange={(x) => setMeta("icon", x)}
                  options={ctx.serviceIcons.map((n) => ({ value: n, label: n }))}
                  placeholder="sparkles"
                />
              </Field>
            </CardContent>
          </Card>
        )}

        {(v.type === "service" || v.type === "article") && (
          <Card>
            <CardHeader>
              <CardTitle>{c.faqCard}</CardTitle>
              <CardDescription>{c.faqHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {v.meta.faq.map((f, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-dashed p-3">
                  <div className="flex gap-2">
                    <Input
                      value={f.q}
                      placeholder={c.faqQuestion}
                      dir="auto"
                      onChange={(e) =>
                        setMeta(
                          "faq",
                          v.meta.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t.common.delete}
                      onClick={() =>
                        setMeta(
                          "faq",
                          v.meta.faq.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <XIcon />
                    </Button>
                  </div>
                  <Textarea
                    value={f.a}
                    placeholder={c.faqAnswer}
                    rows={2}
                    dir="auto"
                    onChange={(e) =>
                      setMeta(
                        "faq",
                        v.meta.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)),
                      )
                    }
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => setMeta("faq", [...v.meta.faq, { q: "", a: "" }])}
              >
                <PlusIcon /> {c.addFaq}
              </Button>
            </CardContent>
          </Card>
        )}

        {(v.type === "vlog" || v.type === "tutorial") && (
          <Card>
            <CardHeader>
              <CardTitle>{c.videoCard}</CardTitle>
            </CardHeader>
            <CardContent>
              <Field label={c.videoUrl} hint={c.videoUrlHint} error={err("videoUrl")}>
                <Input
                  value={v.videoUrl}
                  onChange={(e) => set("videoUrl", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  dir="ltr"
                />
              </Field>
            </CardContent>
          </Card>
        )}

        {/* SEO */}
        <Card>
          <CardHeader>
            <CardTitle>{c.seoCard}</CardTitle>
            <CardDescription>{c.seoHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field
              label={
                <span className="flex w-full items-center justify-between">
                  {c.seoTitle} <Counter n={seoTitle.length} max={SEO_LIMITS.title} />
                </span>
              }
            >
              <Input
                value={v.seoTitle}
                onChange={(e) => set("seoTitle", e.target.value)}
                placeholder={v.title}
                dir="auto"
              />
            </Field>
            <Field
              label={
                <span className="flex w-full items-center justify-between">
                  {c.seoDescription} <Counter n={seoDesc.length} max={SEO_LIMITS.description} />
                </span>
              }
            >
              <Textarea
                value={v.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
                placeholder={v.excerpt}
                rows={3}
                dir="auto"
              />
            </Field>
            <div>
              <p className="mb-2 text-xs font-bold text-muted-foreground">{c.googlePreview}</p>
              <div
                className="rounded-xl border border-border bg-white p-4 font-[arial,sans-serif] dark:bg-grey-900"
                dir={v.locale === "fa" ? "rtl" : "ltr"}
              >
                <p className="truncate text-xs text-[#4d5156] dark:text-grey-400" dir="ltr">
                  {ctx.siteUrl.replace(/^https?:\/\//, "")} ›{" "}
                  {decodeSafe(urlPath).split("/").filter(Boolean).join(" › ")}
                </p>
                <p className="mt-1 truncate text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">
                  {truncate(seoTitle || "—", SEO_LIMITS.title + 5)} | {t.common.appName}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#4d5156] dark:text-grey-400">
                  {truncate(seoDesc || "—", SEO_LIMITS.description)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Side column ── */}
      <div className="space-y-6">
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {c.publishCard}
              <Badge variant={postStatusVariant[v.status]}>{c[`status_${v.status}`]}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label={c.fieldStatus}>
              <SelectField
                value={v.status}
                onChange={(x) => set("status", x as EditorPost["status"])}
                options={(["draft", "scheduled", "published", "archived"] as const).map((s) => ({
                  value: s,
                  label: c[`status_${s}`],
                }))}
              />
            </Field>
            <div className="grid grid-cols-[1fr_6.5rem] gap-2">
              <Field label={c.fieldPublishedAt} error={err("publishedAt")}>
                <DatePicker
                  value={v.publishedDate || null}
                  onChange={(x) => set("publishedDate", x ?? "")}
                />
              </Field>
              <Field label={c.fieldPublishTime}>
                <Input
                  type="time"
                  value={v.publishedTime}
                  onChange={(e) => set("publishedTime", e.target.value)}
                  dir="ltr"
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              {futureDate ? c.status_scheduled : c.publishedAtHint}
            </p>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-dashed p-3">
              <span>
                <span className="block text-sm font-semibold">{c.fieldFeatured}</span>
                <span className="block text-xs text-muted-foreground">{c.featuredHint}</span>
              </span>
              <Switch checked={v.featured} onCheckedChange={(x) => set("featured", x)} />
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={form.pending} className="flex-1">
                {form.pending && <Loader2Icon className="animate-spin" />}
                {initial.id ? c.saveChanges : c.createPost}
              </Button>
              {v.status !== "published" && v.status !== "scheduled" ? (
                <Button
                  type="button"
                  variant="inherit"
                  disabled={form.pending}
                  onClick={() => save("published")}
                >
                  <RocketIcon /> {c.publishNow}
                </Button>
              ) : (
                initial.id && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting}
                    onClick={() => {
                      set("status", "draft");
                      exec(
                        setPostStatusAction({ id: initial.id!, status: "draft" }),
                        c.unpublished,
                      );
                    }}
                  >
                    <Undo2Icon /> {c.unpublish}
                  </Button>
                )
              )}
            </div>
            {initial.publicPath && (
              <a
                href={initial.publicPath}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <ExternalLinkIcon className="size-4" /> {c.viewOnSite}
              </a>
            )}
            {form.message && !Object.keys(form.errors).length && (
              <p className="text-sm text-destructive">{form.message}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <Field label={c.fieldType}>
              <SelectField
                value={v.type}
                onChange={(x) => set("type", x as EditorPost["type"])}
                options={contentTypes.map((k) => ({ value: k, label: t.site[`type_${k}`] }))}
              />
            </Field>
            <Field label={c.fieldLocale}>
              <SelectField
                value={v.locale}
                onChange={(x) => set("locale", x as EditorPost["locale"])}
                options={[
                  { value: "fa", label: c.locale_fa },
                  { value: "en", label: c.locale_en },
                ]}
              />
            </Field>
            {v.type === "tutorial" && (
              <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                <Field label={c.seriesField}>
                  <SelectField
                    value={v.seriesId}
                    onChange={(x) => set("seriesId", x)}
                    noneLabel={c.noSeries}
                    placeholder={c.noSeries}
                    options={series.map((s) => ({ value: s.id, label: s.title }))}
                  />
                </Field>
                <Field label={c.seriesOrder}>
                  <Input
                    value={v.seriesOrder}
                    onChange={(e) => set("seriesOrder", e.target.value)}
                    inputMode="decimal"
                    dir="ltr"
                  />
                </Field>
              </div>
            )}
            <Field label={c.fieldTags} hint={c.tagsHint}>
              <TagsInput value={v.tags} onChange={(x) => set("tags", x)} />
            </Field>
            {(v.type === "service" || v.type === "page") && (
              <Field label={c.fieldSort}>
                <Input
                  value={v.sort}
                  onChange={(e) => set("sort", e.target.value)}
                  inputMode="decimal"
                  dir="ltr"
                />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{c.fieldCover}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-dashed bg-muted">
              {v.coverUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- live preview of any URL */}
                  <img src={v.coverUrl} alt={v.coverAlt} className="size-full object-cover" />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="absolute end-2 top-2"
                    aria-label={c.removeCover}
                    onClick={() => set("coverUrl", "")}
                  >
                    <XIcon />
                  </Button>
                </>
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-8" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <MediaPicker
              onPick={(m) => {
                set("coverUrl", m.url);
                if (m.alt && !v.coverAlt) set("coverAlt", m.alt);
              }}
            />
            <Input
              value={v.coverUrl}
              onChange={(e) => set("coverUrl", e.target.value)}
              placeholder={c.coverUrlPlaceholder}
              dir="ltr"
              aria-label={c.fieldCover}
            />
            <Field label={c.coverAlt}>
              <Input
                value={v.coverAlt}
                onChange={(e) => set("coverAlt", e.target.value)}
                dir="auto"
              />
            </Field>
          </CardContent>
        </Card>

        {initial.id && (
          <TranslationsCard id={initial.id} locale={v.locale} translations={ctx.translations} />
        )}
        {initial.id && <SyndicationCard postId={initial.id} items={ctx.syndications} />}

        {initial.id && (
          <ConfirmDialog
            title={c.deletePost}
            description={c.deletePostBody}
            onConfirm={() =>
              exec(
                deletePostAction({ id: initial.id! }).then((res) => {
                  if (res.ok) router.replace(localePath(uiLocale, "/panel/content"));
                  return res;
                }),
                t.common.delete,
              )
            }
            trigger={
              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
              >
                <Trash2Icon /> {c.deletePost}
              </Button>
            }
          />
        )}
      </div>
    </form>
  );
}

function decodeSafe(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function TranslationsCard({
  id,
  locale,
  translations,
}: {
  id: string;
  locale: "fa" | "en";
  translations: EditorContext["translations"];
}) {
  const t = useT();
  const c = t.content;
  const uiLocale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const other = locale === "fa" ? "en" : "fa";
  const has = translations.some((x) => x.locale === other);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LanguagesIcon className="size-4" /> {c.translations}
        </CardTitle>
        <CardDescription>{c.translationsHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {translations.length === 0 && (
          <p className="text-sm text-muted-foreground">{c.noTranslation}</p>
        )}
        {translations.map((tr) => (
          <a
            key={tr.id}
            href={localePath(uiLocale, `/panel/content/${tr.id}`)}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40"
          >
            <span className="min-w-0 truncate font-semibold" dir="auto">
              {tr.title}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <Badge variant="outline">{c[`locale_${tr.locale}`]}</Badge>
              <Badge variant={postStatusVariant[tr.status]}>{c[`status_${tr.status}`]}</Badge>
            </span>
          </a>
        ))}
        {!has && (
          <Button
            type="button"
            variant="soft"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await createTranslationAction({ id });
                if (res.ok) {
                  toast.success(c.translationCreated);
                  router.push(localePath(uiLocale, `/panel/content/${res.data.id}`));
                } else toast.error(res.error.message);
              })
            }
          >
            {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
            {format(c.createTranslation, { locale: c[`locale_${other}`] })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SyndicationCard({
  postId,
  items,
}: {
  postId: string;
  items: EditorContext["syndications"];
}) {
  const t = useT();
  const c = t.content;
  const { exec, pending } = useAction();
  const [urls, setUrls] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((s) => [s.network, s.externalUrl ?? ""])),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2Icon className="size-4" /> {c.syndication}
        </CardTitle>
        <CardDescription>{c.syndicationHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {NETWORKS.map((n) => {
          const row = items.find((s) => s.network === n);
          return (
            <div key={n} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>{c[`network_${n}`]}</span>
                {row && (
                  <Badge
                    variant={
                      row.status === "posted"
                        ? "success"
                        : row.status === "failed"
                          ? "destructive"
                          : "neutral"
                    }
                  >
                    {c[`synd_${row.status}`]}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={urls[n] ?? ""}
                  onChange={(e) => setUrls((u) => ({ ...u, [n]: e.target.value }))}
                  placeholder={c.externalUrl}
                  dir="ltr"
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || (urls[n] ?? "") === (row?.externalUrl ?? "")}
                  onClick={() =>
                    exec(
                      upsertSyndicationAction({
                        postId,
                        network: n,
                        externalUrl: urls[n] ?? "",
                        status: "posted",
                      }),
                      t.common.saved,
                    )
                  }
                >
                  {c.saveLink}
                </Button>
              </div>
            </div>
          );
        })}
        <p className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
          <RocketIcon className="size-3.5" /> {c.autoPostSoon}
        </p>
      </CardContent>
    </Card>
  );
}
