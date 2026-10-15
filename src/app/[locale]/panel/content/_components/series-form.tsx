"use client";

import { useState, type ReactNode } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { SelectField } from "@/components/shared/select-field";
import { SwitchInput } from "@/components/shared/switch-input";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import {
  createSeriesAction,
  createTestimonialAction,
  deleteSeriesAction,
  deleteTestimonialAction,
  updateSeriesAction,
  updateTestimonialAction,
} from "@/server/modules/content/actions";

export interface SeriesValues {
  id: string;
  locale: "fa" | "en";
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  level: "beginner" | "intermediate" | "advanced" | null;
  status: "draft" | "published";
  sort: number;
}

export function SeriesFormDialog({
  trigger,
  series,
}: {
  trigger: ReactNode;
  series?: SeriesValues;
}) {
  const t = useT();
  const c = t.content;
  const [open, setOpen] = useState(false);
  const form = useActionForm(series ? updateSeriesAction : createSeriesAction, {
    successMessage: t.common.saved,
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), form.reset())}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{series ? c.editSeries : c.newSeries}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.submit} className="grid gap-5 sm:grid-cols-2">
          {series && <input type="hidden" name="id" value={series.id} />}
          <Field
            label={c.fieldTitle}
            error={form.errors.title?.[0]}
            required
            className="sm:col-span-2"
          >
            <Input name="title" defaultValue={series?.title} required autoFocus dir="auto" />
          </Field>
          <Field label={c.fieldSlug} hint={c.slugHint} error={form.errors.slug?.[0]}>
            <Input name="slug" defaultValue={series?.slug} dir="ltr" />
          </Field>
          <Field label={c.fieldLocale}>
            <SelectField
              name="locale"
              defaultValue={series?.locale ?? "fa"}
              options={[
                { value: "fa", label: c.locale_fa },
                { value: "en", label: c.locale_en },
              ]}
            />
          </Field>
          <Field label={c.level}>
            <SelectField
              name="level"
              defaultValue={series?.level ?? ""}
              noneLabel={c.noLevel}
              options={(["beginner", "intermediate", "advanced"] as const).map((l) => ({
                value: l,
                label: t.site[`level_${l}`],
              }))}
            />
          </Field>
          <Field label={c.fieldStatus}>
            <SelectField
              name="status"
              defaultValue={series?.status ?? "draft"}
              options={(["draft", "published"] as const).map((s) => ({
                value: s,
                label: c[`seriesStatus_${s}`],
              }))}
            />
          </Field>
          <Field label={t.common.description} className="sm:col-span-2">
            <Textarea
              name="description"
              defaultValue={series?.description ?? ""}
              rows={3}
              dir="auto"
            />
          </Field>
          <Field label={c.fieldCover}>
            <Input
              name="coverUrl"
              defaultValue={series?.coverUrl ?? ""}
              dir="ltr"
              placeholder="/media/…"
            />
          </Field>
          <Field label={c.fieldSort}>
            <Input name="sort" defaultValue={series?.sort ?? 0} inputMode="decimal" dir="ltr" />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={form.pending}>
              {form.pending && <Loader2Icon className="animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteSeriesButton({ id }: { id: string }) {
  const t = useT();
  const { exec, pending } = useAction();
  return (
    <ConfirmDialog
      description={t.content.deleteSeriesBody}
      onConfirm={() => exec(deleteSeriesAction({ id }), t.common.delete)}
      trigger={
        <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={t.common.delete}>
          <Trash2Icon className="text-destructive" />
        </Button>
      }
    />
  );
}

export interface TestimonialValues {
  id: string;
  locale: "fa" | "en";
  author: string;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  quote: string;
  rating: number | null;
  projectId: string | null;
  clientId: string | null;
  published: boolean;
  sort: number;
}

export function TestimonialFormDialog({
  trigger,
  item,
  projects,
  clients,
}: {
  trigger: ReactNode;
  item?: TestimonialValues;
  projects: { id: string; name: string }[];
  clients: { id: string; name: string }[];
}) {
  const t = useT();
  const c = t.content;
  const [open, setOpen] = useState(false);
  const form = useActionForm(item ? updateTestimonialAction : createTestimonialAction, {
    successMessage: t.common.saved,
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), form.reset())}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? c.editTestimonial : c.newTestimonial}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.submit} className="grid gap-5 sm:grid-cols-2">
          {item && <input type="hidden" name="id" value={item.id} />}
          <Field label={c.author} error={form.errors.author?.[0]} required>
            <Input name="author" defaultValue={item?.author} required autoFocus dir="auto" />
          </Field>
          <Field label={c.authorRole}>
            <Input name="role" defaultValue={item?.role ?? ""} dir="auto" />
          </Field>
          <Field label={c.company}>
            <Input name="company" defaultValue={item?.company ?? ""} dir="auto" />
          </Field>
          <Field label={c.fieldLocale}>
            <SelectField
              name="locale"
              defaultValue={item?.locale ?? "fa"}
              options={[
                { value: "fa", label: c.locale_fa },
                { value: "en", label: c.locale_en },
              ]}
            />
          </Field>
          <Field label={c.quote} error={form.errors.quote?.[0]} required className="sm:col-span-2">
            <Textarea name="quote" defaultValue={item?.quote} rows={4} required dir="auto" />
          </Field>
          <Field label={c.rating}>
            <SelectField
              name="rating"
              defaultValue={item?.rating ? String(item.rating) : "5"}
              noneLabel="—"
              options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) }))}
            />
          </Field>
          <Field label={c.avatarUrl}>
            <Input name="avatarUrl" defaultValue={item?.avatarUrl ?? ""} dir="ltr" />
          </Field>
          <Field label={c.linkedProject}>
            <SelectField
              name="projectId"
              defaultValue={item?.projectId ?? ""}
              noneLabel={c.noProject}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label={c.linkedClient}>
            <SelectField
              name="clientId"
              defaultValue={item?.clientId ?? ""}
              noneLabel="—"
              options={clients.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label={c.fieldSort}>
            <Input name="sort" defaultValue={item?.sort ?? 0} inputMode="decimal" dir="ltr" />
          </Field>
          <label className="flex items-center justify-between gap-3 self-end rounded-lg border border-dashed px-3 py-2 text-sm font-semibold">
            {c.publishedToggle}
            <SwitchInput name="published" defaultChecked={item?.published ?? true} />
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={form.pending}>
              {form.pending && <Loader2Icon className="animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteTestimonialButton({ id }: { id: string }) {
  const t = useT();
  const { exec, pending } = useAction();
  return (
    <ConfirmDialog
      onConfirm={() => exec(deleteTestimonialAction({ id }), t.common.delete)}
      trigger={
        <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={t.common.delete}>
          <Trash2Icon className="text-destructive" />
        </Button>
      }
    />
  );
}
