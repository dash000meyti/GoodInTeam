"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  CircleDotIcon,
  HistoryIcon,
  InfoIcon,
  Loader2Icon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Kbd } from "@/components/ui/kbd";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { SelectField } from "@/components/shared/select-field";
import { PageHeader, type Crumb } from "@/components/panel/page-header";
import { format } from "@/i18n/format-message";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { formatDateTime, type FormatOptions } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createDocAction, updateDocAction } from "@/server/modules/docs/actions";
import { EmojiPicker } from "./emoji-picker";
import { VISIBILITY_ICONS, type DocVisibility } from "./visibility-badge";

export interface DocEditorValues {
  title: string;
  icon: string | null;
  contentMd: string;
  visibility: DocVisibility;
  parentId: string | null;
  projectId: string | null;
  clientId: string | null;
}

interface Draft {
  title: string;
  icon: string | null;
  contentMd: string;
  savedAt: number;
}

const VISIBILITIES: DocVisibility[] = ["private", "team", "client"];
const draftKey = (id: string | null) => `gt-doc-draft:${id ?? "new"}`;

function readDraft(id: string | null): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    if (typeof d.contentMd !== "string" || typeof d.title !== "string") return null;
    return {
      title: d.title,
      icon: typeof d.icon === "string" ? d.icon : null,
      contentMd: d.contentMd,
      savedAt: Number(d.savedAt) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Create / edit a doc page. Edits are kept as a local draft (localStorage, per
 * page) while typing, so a closed tab never loses work; saving clears it.
 */
export function DocEditor({
  docId,
  initial,
  canManage,
  parents,
  projects,
  clients,
  crumbs,
  fmt,
}: {
  /** null → creating a new page. */
  docId: string | null;
  initial: DocEditorValues;
  /** Author/admin: may change visibility. */
  canManage: boolean;
  parents: { id: string; title: string; icon: string | null; depth: number }[];
  projects: { id: string; name: string; shareDocs: boolean }[];
  clients: { id: string; name: string }[];
  crumbs: Crumb[];
  fmt: FormatOptions;
}) {
  const t = useT();
  const d = t.docs;
  const locale = useLocale();
  const router = useRouter();
  const [values, setValues] = useState<DocEditorValues>(initial);
  const [baseline, setBaseline] = useState<DocEditorValues>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  const dirty = useMemo(
    () => (Object.keys(values) as (keyof DocEditorValues)[]).some((k) => values[k] !== baseline[k]),
    [values, baseline],
  );
  const set = <K extends keyof DocEditorValues>(k: K, v: DocEditorValues[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // Offer to restore a local draft that differs from what's saved.
  useEffect(() => {
    const found = readDraft(docId);
    if (
      found &&
      (found.contentMd !== initial.contentMd ||
        found.title !== initial.title ||
        found.icon !== initial.icon)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser-only storage after mount
      setDraft(found);
    }
  }, [docId, initial.contentMd, initial.title, initial.icon]);

  // Autosave the text parts locally (debounced) while there are unsaved changes.
  useEffect(() => {
    if (!dirty || draft) return;
    const timer = window.setTimeout(() => {
      try {
        const savedAt = Date.now();
        localStorage.setItem(
          draftKey(docId),
          JSON.stringify({
            title: values.title,
            icon: values.icon,
            contentMd: values.contentMd,
            savedAt,
          } satisfies Draft),
        );
        setDraftSavedAt(savedAt);
      } catch {}
    }, 700);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, docId, values.title, values.icon, values.contentMd]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const save = useCallback(() => {
    if (!values.title.trim()) {
      setErrors({ title: d.titleRequired });
      titleRef.current?.focus();
      return;
    }
    if (values.visibility === "client" && !values.projectId && !values.clientId) {
      setErrors({ visibility: d.clientNeedsLink });
      return;
    }
    start(async () => {
      const payload = {
        title: values.title.trim(),
        icon: values.icon,
        contentMd: values.contentMd,
        parentId: values.parentId,
        projectId: values.projectId,
        clientId: values.clientId,
        ...(docId === null || canManage ? { visibility: values.visibility } : {}),
      };
      const res = docId
        ? await updateDocAction({ id: docId, ...payload })
        : await createDocAction({ ...payload, visibility: values.visibility });
      if (!res.ok) {
        const fe = res.error.fieldErrors ?? {};
        setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0]])));
        toast.error(res.error.message);
        return;
      }
      try {
        localStorage.removeItem(draftKey(docId));
      } catch {}
      // Next.js keeps this route alive after navigating away (<Activity>): reset a
      // "new page" form so the next visit starts empty.
      if (docId) setBaseline(values);
      else {
        setValues(initial);
        setBaseline(initial);
      }
      setDraftSavedAt(null);
      toast.success(docId ? d.saved : d.created);
      router.push(localePath(locale, `/panel/docs/${res.data.id}`));
    });
  }, [values, docId, canManage, d, router, locale, initial]);

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const cancel = () => {
    if (dirty && !window.confirm(d.leaveWarning)) return;
    try {
      localStorage.removeItem(draftKey(docId));
    } catch {}
    setValues(initial);
    setBaseline(initial);
    setDraftSavedAt(null);
    if (docId) router.push(localePath(locale, `/panel/docs/${docId}`));
    else router.back();
  };

  const project = projects.find((p) => p.id === values.projectId);
  const status = pending ? (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2Icon className="size-3.5 animate-spin" /> {t.common.saving}
    </span>
  ) : dirty ? (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#b76e00] dark:text-warning">
      <CircleDotIcon className="size-3.5" />
      {draftSavedAt ? d.draftSaved : d.unsaved}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckIcon className="size-3.5 text-success" /> {d.allSaved}
    </span>
  );

  return (
    <>
      <PageHeader
        title={docId ? d.editPage : d.newPageTitle}
        crumbs={crumbs}
        actions={
          <>
            <span className="hidden sm:inline-flex">{status}</span>
            <Button variant="outline" onClick={cancel} disabled={pending}>
              <XIcon /> {t.common.cancel}
            </Button>
            <Button onClick={save} disabled={pending} data-testid="doc-save">
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {t.common.save}
              <Kbd className="ms-1 hidden bg-white/20 text-current md:inline-flex" dir="ltr">
                {d.saveShortcut}
              </Kbd>
            </Button>
          </>
        }
      />

      {draft && (
        <div
          role="status"
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center"
        >
          <HistoryIcon className="size-5 shrink-0 text-[#b76e00] dark:text-warning" />
          <p className="flex-1 text-sm font-medium">
            {format(d.draftFound, { time: formatDateTime(draft.savedAt, fmt) })}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setValues((v) => ({
                  ...v,
                  title: draft.title,
                  icon: draft.icon,
                  contentMd: draft.contentMd,
                }));
                setDraft(null);
              }}
            >
              {d.restoreDraft}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                try {
                  localStorage.removeItem(draftKey(docId));
                } catch {}
                setDraft(null);
              }}
            >
              {d.discardDraft}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Card className="gap-5 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <EmojiPicker value={values.icon} onChange={(v) => set("icon", v)} />
            <div className="min-w-0 flex-1">
              <label htmlFor="doc-title" className="sr-only">
                {d.pageTitle}
              </label>
              <input
                id="doc-title"
                ref={titleRef}
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={d.titlePlaceholder}
                dir="auto"
                autoFocus={!docId}
                maxLength={200}
                aria-invalid={!!errors.title || undefined}
                className="w-full bg-transparent text-2xl font-extrabold tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-3xl"
              />
              {errors.title && (
                <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                  {errors.title}
                </p>
              )}
            </div>
          </div>
          <MarkdownEditor
            value={values.contentMd}
            onChange={(v) => set("contentMd", v)}
            rows={22}
            mono={false}
            placeholder={d.contentPlaceholder}
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:hidden">
            {status}
          </p>
        </Card>

        <Card className="h-fit gap-5 p-5 xl:sticky xl:top-24">
          <h2 className="text-sm font-bold">{d.settings}</h2>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">{d.visibility}</legend>
            {VISIBILITIES.map((v) => {
              const Icon = VISIBILITY_ICONS[v];
              const active = values.visibility === v;
              const disabled = !!docId && !canManage;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => set("visibility", v)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "border-primary bg-primary/6 ring-1 ring-primary"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="space-y-0.5">
                    <span className="block text-sm font-semibold">{d[`visibility_${v}`]}</span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {d[`visibilityHint_${v}`]}
                    </span>
                  </span>
                </button>
              );
            })}
            {docId && !canManage && (
              <p className="text-xs text-muted-foreground">{d.visibilityLocked}</p>
            )}
            {errors.visibility && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.visibility}
              </p>
            )}
          </fieldset>

          <Field label={d.parent} error={errors.parentId}>
            <SelectField
              value={values.parentId ?? ""}
              onChange={(v) => set("parentId", v || null)}
              noneLabel={d.noParent}
              placeholder={d.noParent}
              options={parents.map((p) => ({
                value: p.id,
                label: (
                  <span style={{ paddingInlineStart: p.depth * 12 }} className="truncate">
                    {p.icon ? `${p.icon} ` : ""}
                    {p.title}
                  </span>
                ),
              }))}
            />
          </Field>
          <Field label={d.project} error={errors.projectId}>
            <SelectField
              value={values.projectId ?? ""}
              onChange={(v) => set("projectId", v || null)}
              noneLabel={d.noProject}
              placeholder={d.noProject}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          {clients.length > 0 && (
            <Field label={d.client} error={errors.clientId}>
              <SelectField
                value={values.clientId ?? ""}
                onChange={(v) => set("clientId", v || null)}
                noneLabel={d.noClient}
                placeholder={d.noClient}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
          )}
          {values.visibility === "client" && (
            <p className="flex gap-2 rounded-lg bg-info/10 p-3 text-xs leading-5 text-[#006c9c] dark:text-info">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
              {!values.projectId && !values.clientId
                ? d.clientNeedsLink
                : project && !project.shareDocs && !values.clientId
                  ? d.shareDocsOff
                  : d.visibilityHint_client}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
