"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  BookmarkPlusIcon,
  BracesIcon,
  Loader2Icon,
  SaveIcon,
  WandSparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/shared/date-picker";
import { FrameBox, FrameCell, FrameGrid, HEADING_CLASS } from "@/components/shell/frame";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { SelectField } from "@/components/shared/select-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { contractKinds } from "@/server/db/enums";
import {
  applyTemplateAction,
  createContractAction,
  saveAsTemplateAction,
  updateContractAction,
} from "@/server/modules/contracts/actions";
import { BUILTIN_PLACEHOLDERS, extractPlaceholders } from "@/server/modules/contracts/placeholders";
import { FrameNote } from "../../projects/_components/frame-parts";
import { placeholderLabel } from "./format";
import { TemplatePicker, type PickableTemplate } from "./template-picker";

type Kind = (typeof contractKinds)[number];

export interface EditorValues {
  id?: string;
  title: string;
  kind: Kind;
  clientId: string | null;
  projectId: string | null;
  requireSignature: boolean;
  /** "YYYY-MM-DD" */
  expiresAt: string | null;
  signerName: string | null;
  signerEmail: string | null;
  bodyMd: string;
}

export interface EditorClient {
  id: string;
  name: string;
  signerName: string;
  signerEmail: string | null;
}

export interface EditorProject {
  id: string;
  name: string;
  clientId: string | null;
}

/**
 * The contract / template editor (framed): an optional re-issue note, then the
 * document box (title, body, unresolved placeholders as rows) beside the
 * settings box (kind and signature, parties, placeholders), and a sticky
 * framed save bar.
 */
export function ContractEditor({
  mode,
  isTemplate,
  initial,
  clients,
  projects,
  templates,
  starters,
  sentVersion,
  cancelHref,
}: {
  mode: "create" | "edit";
  isTemplate: boolean;
  initial: EditorValues;
  clients: EditorClient[];
  projects: EditorProject[];
  templates: PickableTemplate[];
  starters: PickableTemplate[];
  /** Set when editing a document that was already sent (shows the re-issue warning). */
  sentVersion?: number;
  cancelHref: string;
}) {
  const t = useT();
  const c = t.contracts;
  const locale = useLocale();
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [body, setBody] = useState(initial.bodyMd);
  const [requireSignature, setRequireSignature] = useState(initial.requireSignature);
  const [clientId, setClientId] = useState(initial.clientId ?? "");
  const [projectId, setProjectId] = useState(initial.projectId ?? "");
  const [signerName, setSignerName] = useState(initial.signerName ?? "");
  const [signerEmail, setSignerEmail] = useState(initial.signerEmail ?? "");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const listHref = localePath(locale, "/panel/contracts");
  const form = useActionForm(mode === "create" ? createContractAction : updateContractAction, {
    onSuccess: (data) => {
      const d = data as { id: string; isTemplate: boolean; reissued?: boolean; version?: number };
      if (d.reissued && d.version)
        toast.success(format(c.reissuedToast, { n: formatNumber(d.version, locale) }));
      else toast.success(t.common.saved);
      router.push(
        d.isTemplate ? `${listHref}?tab=templates` : localePath(locale, `/panel/contracts/${d.id}`),
      );
    },
  });

  const unresolved = useMemo(() => extractPlaceholders(`${title}\n${body}`), [title, body]);
  const projectChoices = useMemo(
    () => projects.filter((p) => !clientId || !p.clientId || p.clientId === clientId),
    [projects, clientId],
  );

  const onClientChange = (id: string) => {
    const prev = clients.find((x) => x.id === clientId);
    const next = clients.find((x) => x.id === id);
    setClientId(id);
    // Prefill the signer unless the user typed someone else.
    if (!signerName || signerName === prev?.signerName) setSignerName(next?.signerName ?? "");
    if (!signerEmail || signerEmail === prev?.signerEmail) setSignerEmail(next?.signerEmail ?? "");
    if (projectId && id) {
      const p = projects.find((x) => x.id === projectId);
      if (p?.clientId && p.clientId !== id) setProjectId("");
    }
  };

  const onProjectChange = (id: string) => {
    setProjectId(id);
    const p = projects.find((x) => x.id === id);
    if (p?.clientId && !clientId) onClientChange(p.clientId);
  };

  const applyTemplate = async (tpl: PickableTemplate) => {
    if (body.trim() && body !== initial.bodyMd && !window.confirm(c.replaceBodyConfirm))
      return false;
    const res = await applyTemplateAction({
      templateId: tpl.id,
      starter: tpl.starter,
      clientId: clientId || undefined,
      projectId: projectId || undefined,
    });
    if (!res.ok) {
      toast.error(res.error.message);
      return false;
    }
    setTitle(res.data.title);
    setKind(res.data.kind);
    setRequireSignature(res.data.requireSignature);
    setBody(res.data.bodyMd);
    toast.success(c.templateApplied);
    return true;
  };

  const saveAsTemplate = async () => {
    setSavingTemplate(true);
    const res = await saveAsTemplateAction({
      title: title.trim() || c.newTemplate,
      kind,
      requireSignature,
      bodyMd: body,
    });
    setSavingTemplate(false);
    if (res.ok) toast.success(c.savedAsTemplate);
    else toast.error(res.error.message);
  };

  const copyPlaceholder = async (key: string) => {
    try {
      await navigator.clipboard.writeText(`{{${key}}}`);
      toast.success(`${t.common.copied}: {{${key}}}`);
    } catch {
      /* clipboard blocked: ignore */
    }
  };

  const willReissue = sentVersion != null;

  return (
    <form onSubmit={form.submit} className="flex flex-col gap-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {mode === "create" && isTemplate && <input type="hidden" name="isTemplate" value="true" />}
      <input type="hidden" name="requireSignature" value={requireSignature ? "true" : "false"} />

      {willReissue && (
        <FrameNote icon={AlertTriangleIcon} tone="warning">
          {format(c.reissueWarning, {
            n: formatNumber(sentVersion, locale),
            next: formatNumber(sentVersion + 1, locale),
          })}
        </FrameNote>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* The document box: title row, body row, unresolved placeholders row. */}
        <FrameBox as="div" density="compact">
          <FrameGrid cols={1}>
            <FrameCell>
              <Field label={c.fieldTitle} htmlFor="title" error={form.errors.title?.[0]} required>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={300}
                  dir="auto"
                  autoFocus={mode === "create" && !initial.title}
                  className="h-11 text-base font-semibold"
                />
              </Field>
            </FrameCell>
          </FrameGrid>

          <FrameGrid cols={1}>
            <FrameCell className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="bodyMd">{c.fieldBody}</Label>
                {!isTemplate && (
                  <TemplatePicker
                    templates={templates}
                    starters={starters}
                    onPick={applyTemplate}
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <WandSparklesIcon /> {c.startFromTemplate}
                      </Button>
                    }
                  />
                )}
              </div>
              <MarkdownEditor
                name="bodyMd"
                value={body}
                onChange={setBody}
                rows={24}
                dir="auto"
                placeholder={c.bodyPlaceholder}
                // Monospace breaks Persian letter joining → write contracts in the UI font.
                className="[&_textarea]:min-h-[50vh] [&_textarea]:font-sans [&_textarea]:text-[15px] [&_textarea]:leading-8"
              />
              {form.errors.bodyMd?.[0] ? (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {form.errors.bodyMd[0]}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isTemplate ? c.templateBodyHint : c.bodyHint}
                </p>
              )}
            </FrameCell>
          </FrameGrid>

          {!isTemplate && unresolved.length > 0 && (
            <FrameGrid cols={1}>
              <FrameCell className="space-y-2 bg-warning/8">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <BracesIcon className="size-4 text-warning-ink" />
                  {format(c.unresolvedCount, { n: formatNumber(unresolved.length, locale) })}
                </p>
                <div className="flex flex-wrap gap-1.5" dir="ltr">
                  {unresolved.map((k) => (
                    <Badge key={k} variant="warning" className="font-mono">
                      {`{{${k}}}`}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{c.unresolvedHint}</p>
              </FrameCell>
            </FrameGrid>
          )}
        </FrameBox>

        {/* The settings box: kind and signature, parties, placeholders. */}
        <FrameBox as="aside" density="compact">
          <FrameGrid cols={1}>
            <FrameCell className="grid gap-5">
              <Field label={c.kind}>
                <SelectField
                  name="kind"
                  value={kind}
                  onChange={(v) => setKind(v as Kind)}
                  options={contractKinds.map((k) => ({ value: k, label: c[`kind_${k}`] }))}
                />
              </Field>
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span className="space-y-1">
                  <span className="block text-sm font-semibold">{c.fieldRequireSignature}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.requireSignatureHint}
                  </span>
                </span>
                <Switch checked={requireSignature} onCheckedChange={setRequireSignature} />
              </label>
            </FrameCell>
          </FrameGrid>

          {!isTemplate && (
            <FrameGrid cols={1}>
              <FrameCell className="grid gap-5">
                <Field label={c.fieldClient} error={form.errors.clientId?.[0]}>
                  <SelectField
                    name="clientId"
                    value={clientId}
                    onChange={onClientChange}
                    noneLabel={c.noClient}
                    placeholder={c.noClient}
                    options={clients.map((x) => ({ value: x.id, label: x.name }))}
                  />
                </Field>
                <Field label={c.fieldProject} error={form.errors.projectId?.[0]}>
                  <SelectField
                    name="projectId"
                    value={projectId}
                    onChange={onProjectChange}
                    noneLabel={c.noProject}
                    placeholder={c.noProject}
                    options={projectChoices.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </Field>
                <Field
                  label={c.fieldSignerName}
                  htmlFor="signerName"
                  hint={c.signerHint}
                  error={form.errors.signerName?.[0]}
                >
                  <Input
                    id="signerName"
                    name="signerName"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    dir="auto"
                  />
                </Field>
                <Field
                  label={c.fieldSignerEmail}
                  htmlFor="signerEmail"
                  error={form.errors.signerEmail?.[0]}
                >
                  <Input
                    id="signerEmail"
                    name="signerEmail"
                    type="email"
                    dir="ltr"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                  />
                </Field>
                <Field
                  label={c.fieldExpires}
                  hint={c.expiresHint}
                  error={form.errors.expiresAt?.[0]}
                >
                  <DatePicker name="expiresAt" defaultValue={initial.expiresAt} />
                </Field>
              </FrameCell>
            </FrameGrid>
          )}

          <FrameGrid cols={1}>
            <FrameCell as="section" pad="none" aria-labelledby="ct-placeholders">
              <CardHeader>
                <h2
                  id="ct-placeholders"
                  className={cn(HEADING_CLASS.box, "flex items-center gap-2")}
                >
                  <BracesIcon className="size-4 text-muted-foreground" /> {c.placeholdersTitle}
                </h2>
                <CardDescription>{c.placeholdersHint}</CardDescription>
              </CardHeader>
              <ul className="grid gap-0.5 p-2">
                {BUILTIN_PLACEHOLDERS.map((k) => (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => copyPlaceholder(k)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-start text-sm transition-colors hover:bg-card"
                    >
                      <span className="text-muted-foreground">{placeholderLabel(k, c)}</span>
                      <code dir="ltr" className="font-mono text-xs text-primary-ink">
                        {`{{${k}}}`}
                      </code>
                    </button>
                  </li>
                ))}
              </ul>
            </FrameCell>
          </FrameGrid>
        </FrameBox>
      </div>

      {/* Sticky save bar: a framed box, 95% opaque (no blur), above the dock. */}
      <div className="sticky above-dock z-20">
        <div
          data-density="compact"
          className="frame-box flex flex-wrap items-center justify-end gap-2 bg-background/95 p-2.5 dark:bg-card/95"
        >
          <Button asChild type="button" variant="ghost">
            <Link href={cancelHref}>{t.common.cancel}</Link>
          </Button>
          {!isTemplate && (
            <Button
              type="button"
              variant="outline"
              onClick={saveAsTemplate}
              disabled={savingTemplate || !body.trim()}
            >
              {savingTemplate ? <Loader2Icon className="animate-spin" /> : <BookmarkPlusIcon />}
              <span className="hidden sm:inline">{c.saveAsTemplate}</span>
            </Button>
          )}
          <Button type="submit" disabled={form.pending}>
            {form.pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            {isTemplate ? c.saveTemplate : mode === "create" ? c.saveDraft : c.saveChanges}
          </Button>
        </div>
      </div>
    </form>
  );
}
