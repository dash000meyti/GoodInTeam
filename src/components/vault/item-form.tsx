"use client";

import { useId, useState, useTransition } from "react";
import {
  ClipboardPasteIcon,
  Loader2Icon,
  LockIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/shared/select-field";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { parseTotp } from "@/lib/totp";
import { encryptItem } from "@/lib/vault-crypto";
import { cn } from "@/lib/utils";
import { createVaultItemAction, updateVaultItemAction } from "@/server/modules/vault/actions";
import { parseEnv } from "./formats";
import type { LinkOption } from "./item-detail";
import {
  cleanPayload,
  emptyPayload,
  TYPE_FIELDS,
  TYPE_ICONS,
  VAULT_ITEM_TYPES,
  type CustomField,
  type EnvPair,
  type FieldDef,
  type VaultEntry,
  type VaultItemType,
  type VaultPayload,
} from "./item-types";
import { GeneratorPopover } from "./password-generator";
import { PasswordInput } from "./password-input";
import { StrengthMeter } from "./strength-meter";
import { TotpCode } from "./totp-code";
import { useVaultKey } from "./vault-provider";

export interface ItemFormTarget {
  entry?: VaultEntry;
  type: VaultItemType;
  projectId?: string | null;
}

/** Create / edit dialog. Encrypts in the browser, then sends only ciphertext. */
export function ItemFormDialog({
  target,
  onOpenChange,
  projects,
  clients,
  onSaved,
}: {
  target: ItemFormTarget | null;
  onOpenChange: (open: boolean) => void;
  projects: LinkOption[];
  clients: LinkOption[];
  onSaved?: (id: string) => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {target && (
          <ItemForm
            key={`${target.entry?.id ?? "new"}:${target.type}`}
            target={target}
            projects={projects}
            clients={clients}
            onDone={(id) => {
              onOpenChange(false);
              if (id) onSaved?.(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  target,
  projects,
  clients,
  onDone,
}: {
  target: ItemFormTarget;
  projects: LinkOption[];
  clients: LinkOption[];
  onDone: (savedId?: string) => void;
}) {
  const t = useT();
  const v = t.vault;
  const key = useVaultKey();
  const id = useId();
  const { entry } = target;
  const [draft, setDraft] = useState<VaultPayload>(() =>
    entry?.payload ? structuredClone(entry.payload) : emptyPayload(target.type),
  );
  const [projectId, setProjectId] = useState(entry?.projectId ?? target.projectId ?? "");
  const [clientId, setClientId] = useState(entry?.clientId ?? "");
  const [favorite, setFavorite] = useState(entry?.favorite ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const typeLabel = v[`type_${draft.type}`];
  const setField = (k: string, value: string) =>
    setDraft((d) => ({ ...d, fields: { ...d.fields, [k]: value } }));

  const submit = () =>
    start(async () => {
      const payload = cleanPayload(draft);
      if (!payload.title) return setError(v.titleRequired);
      if (payload.fields.totp && !parseTotp(payload.fields.totp)) return setError(v.totpInvalid);
      setError(null);
      try {
        const blob = await encryptItem(key, payload);
        const input = {
          type: payload.type,
          projectId: projectId || null,
          clientId: clientId || null,
          favorite,
          ...blob,
        };
        const res = entry
          ? await updateVaultItemAction({ id: entry.id, ...input })
          : await createVaultItemAction(input);
        if (!res.ok) {
          setError(res.error.message);
          return;
        }
        toast.success(v.itemSaved);
        onDone(res.data.id);
      } catch {
        setError(v.cryptoError);
      }
    });

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {format(entry ? v.editItemTitle : v.newItemTitle, { type: typeLabel })}
        </DialogTitle>
        <DialogDescription className="flex items-center gap-1.5 text-xs sm:justify-start">
          <LockIcon className="size-3.5" /> {v.encryptedNote}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 sm:grid-cols-2">
        {!entry && (
          <Field label={v.itemType} className="sm:col-span-2">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={v.itemType}>
              {VAULT_ITEM_TYPES.map((ty) => {
                const Icon = TYPE_ICONS[ty];
                const active = draft.type === ty;
                return (
                  <button
                    key={ty}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDraft((d) => ({ ...d, type: ty }))}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary-dark dark:text-primary-light"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="size-3.5" /> {v[`type_${ty}`]}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
        <Field label={v.itemTitle} htmlFor={`${id}-title`} required className="sm:col-span-2">
          <Input
            id={`${id}-title`}
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            autoFocus
            autoComplete="off"
            dir="auto"
          />
        </Field>

        {TYPE_FIELDS[draft.type].map((def) => (
          <FieldInput
            key={def.key}
            id={`${id}-${def.key}`}
            def={def}
            value={draft.fields[def.key] ?? ""}
            onChange={(val) => setField(def.key, val)}
          />
        ))}

        {draft.type === "env" && (
          <EnvEditor pairs={draft.env} onChange={(env) => setDraft((d) => ({ ...d, env }))} />
        )}

        <CustomFieldsEditor
          fields={draft.custom}
          onChange={(custom) => setDraft((d) => ({ ...d, custom }))}
          defaultOpen={draft.type === "other"}
        />

        <fieldset className="grid gap-4 rounded-xl border border-dashed p-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="px-1 text-sm font-bold">{v.linkTo}</legend>
          <Field label={v.project}>
            <SelectField
              value={projectId}
              onChange={setProjectId}
              noneLabel={v.noProject}
              placeholder={v.noProject}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          {clients.length > 0 && (
            <Field label={v.client}>
              <SelectField
                value={clientId}
                onChange={setClientId}
                noneLabel={v.noClient}
                placeholder={v.noClient}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
          )}
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm sm:col-span-2">
            <span className="flex items-center gap-2">
              <StarIcon className={cn("size-4", favorite && "fill-warning text-warning")} />
              {v.addFavorite}
            </span>
            <Switch checked={favorite} onCheckedChange={setFavorite} />
          </label>
        </fieldset>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onDone()}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          {pending ? v.encrypting : t.common.save}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FieldInput({
  id,
  def,
  value,
  onChange,
}: {
  id: string;
  def: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  const label = t.vault[`field_${def.key}`];
  const wide = def.kind === "multiline" || def.kind === "secretMultiline" || def.kind === "totp";
  const className = cn(wide && "sm:col-span-2");

  switch (def.kind) {
    case "secret":
      return (
        <Field label={label} htmlFor={id} className={className}>
          <PasswordInput
            id={id}
            value={value}
            onChange={onChange}
            placeholder={def.placeholder}
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            adornment={def.generator ? <GeneratorPopover onUse={onChange} /> : undefined}
          />
          {def.generator && <StrengthMeter password={value} />}
        </Field>
      );
    case "secretMultiline":
    case "multiline":
      return (
        <Field label={label} htmlFor={id} className={className}>
          <Textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={def.placeholder}
            rows={def.kind === "secretMultiline" ? 6 : 3}
            dir={def.kind === "secretMultiline" ? "ltr" : "auto"}
            spellCheck={def.kind !== "secretMultiline"}
            className={cn(def.kind === "secretMultiline" && "font-mono text-xs")}
          />
        </Field>
      );
    case "totp": {
      const parsed = value.trim() ? parseTotp(value) : null;
      return (
        <Field
          label={label}
          htmlFor={id}
          className={className}
          hint={t.vault.totpHint}
          error={value.trim() && !parsed ? t.vault.totpInvalid : null}
        >
          <Input
            id={id}
            dir="ltr"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={def.placeholder}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
          {parsed && (
            <div className="rounded-xl bg-muted/50 px-3 py-2">
              <TotpCode secret={value} size="sm" />
            </div>
          )}
        </Field>
      );
    }
    case "select":
      return (
        <Field label={label} className={className}>
          <SelectField
            value={value}
            onChange={onChange}
            placeholder="—"
            options={(def.options ?? []).map((o) => ({
              value: o,
              label: o === "Other" ? t.vault.type_other : o,
            }))}
          />
        </Field>
      );
    default:
      return (
        <Field label={label} htmlFor={id} className={className}>
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={def.placeholder}
            dir={def.key === "holder" ? "auto" : "ltr"}
            inputMode={def.kind === "port" ? "numeric" : def.kind === "url" ? "url" : undefined}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
      );
  }
}

function EnvEditor({ pairs, onChange }: { pairs: EnvPair[]; onChange: (p: EnvPair[]) => void }) {
  const t = useT();
  const v = t.vault;
  const locale = useLocale();
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");
  const rows = pairs.length ? pairs : [];

  const apply = () => {
    const parsed = parseEnv(text);
    const next = [...pairs];
    for (const p of parsed) {
      const i = next.findIndex((x) => x.key === p.key);
      if (i >= 0) next[i] = p;
      else next.push(p);
    }
    onChange(next);
    setText("");
    setPasting(false);
    toast.success(format(v.envImported, { n: formatNumber(parsed.length, locale) }));
  };

  return (
    <div className="grid gap-3 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{v.envVariables}</span>
        <Button type="button" variant="soft" size="sm" onClick={() => setPasting((p) => !p)}>
          <ClipboardPasteIcon /> {v.importEnv}
        </Button>
      </div>
      {pasting && (
        <div className="grid gap-2 rounded-xl border border-dashed p-3">
          <p className="text-xs text-muted-foreground">{v.importEnvHint}</p>
          <Textarea
            dir="ltr"
            rows={6}
            aria-label={v.importEnv}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"DATABASE_URL=postgres://…\nAPI_KEY=…"}
            className="font-mono text-xs"
            spellCheck={false}
          />
          <Button type="button" size="sm" className="w-fit" onClick={apply} disabled={!text.trim()}>
            {v.importEnvApply}
          </Button>
        </div>
      )}
      {rows.length === 0 && !pasting && (
        <p className="text-sm text-muted-foreground">{v.envEmpty}</p>
      )}
      {rows.map((p, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-2"
        >
          <Input
            dir="ltr"
            value={p.key}
            aria-label={v.envKey}
            placeholder={v.envKey}
            onChange={(e) =>
              onChange(
                pairs.map((x, j) =>
                  j === i ? { ...x, key: e.target.value.replace(/\s/g, "_") } : x,
                ),
              )
            }
            className="font-mono text-xs uppercase"
            spellCheck={false}
          />
          <PasswordInput
            value={p.value}
            aria-label={v.envValue}
            placeholder={v.envValue}
            onChange={(val) => onChange(pairs.map((x, j) => (j === i ? { ...x, value: val } : x)))}
            className="text-xs"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.common.delete}
            onClick={() => onChange(pairs.filter((_, j) => j !== i))}
          >
            <Trash2Icon className="text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...pairs, { key: "", value: "" }])}
      >
        <PlusIcon /> {v.addVariable}
      </Button>
    </div>
  );
}

function CustomFieldsEditor({
  fields,
  onChange,
  defaultOpen,
}: {
  fields: CustomField[];
  onChange: (f: CustomField[]) => void;
  defaultOpen: boolean;
}) {
  const t = useT();
  const v = t.vault;
  const show = fields.length > 0 || defaultOpen;
  const add = () => onChange([...fields, { label: "", value: "", concealed: true }]);
  if (!show) {
    return (
      <div className="sm:col-span-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={add}
          className="text-muted-foreground"
        >
          <PlusIcon /> {v.addField}
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:col-span-2">
      <span className="text-sm font-semibold">{v.customFields}</span>
      {fields.map((f, i) => {
        const set = (patch: Partial<CustomField>) =>
          onChange(fields.map((x, j) => (j === i ? { ...x, ...patch } : x)));
        return (
          <div
            key={i}
            className="grid gap-2 rounded-xl border border-dashed p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] sm:items-center sm:border-0 sm:p-0"
          >
            <Input
              value={f.label}
              placeholder={v.fieldLabel}
              aria-label={v.fieldLabel}
              onChange={(e) => set({ label: e.target.value })}
              dir="auto"
            />
            {f.concealed ? (
              <PasswordInput
                value={f.value}
                placeholder={v.fieldValue}
                aria-label={v.fieldValue}
                onChange={(value) => set({ value })}
                autoComplete="off"
              />
            ) : (
              <Input
                value={f.value}
                placeholder={v.fieldValue}
                aria-label={v.fieldValue}
                onChange={(e) => set({ value: e.target.value })}
                dir="auto"
              />
            )}
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={f.concealed} onCheckedChange={(c) => set({ concealed: c })} />
                {v.concealed}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={v.removeField}
                onClick={() => onChange(fields.filter((_, j) => j !== i))}
              >
                <Trash2Icon className="text-destructive" />
              </Button>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={add}>
        <PlusIcon /> {v.addField}
      </Button>
    </div>
  );
}
