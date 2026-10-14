"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import {
  DownloadIcon,
  FileWarningIcon,
  KeySquareIcon,
  Loader2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatDateTime, formatNumber, type FormatOptions } from "@/lib/format";
import {
  decryptItem,
  encryptItem,
  generateRecoveryKey,
  parseRecoveryKey,
  unlockWithPassword,
  unlockWithRecoveryKey,
  VaultCryptoError,
  wrapWithPassword,
  wrapWithRecoveryKey,
  type VaultKeyMaterial,
} from "@/lib/vault-crypto";
import { importVaultItemsAction, updateVaultKeysAction } from "@/server/modules/vault/actions";
import { BACKUP_FORMAT, downloadText, parseBackup, toCsv, type VaultBackup } from "./formats";
import type { LinkOption } from "./item-detail";
import { isVaultItemType, TYPE_FIELDS, type VaultEntry, type VaultItemRecord } from "./item-types";
import {
  MasterPasswordFields,
  masterPasswordReady,
  type MasterPasswordValue,
} from "./master-password-fields";
import { PasswordInput } from "./password-input";
import { RecoveryKeyPanel } from "./recovery-key-panel";
import { ResetVaultDialog } from "./reset-vault-dialog";
import { useVaultKey } from "./vault-provider";

export type MaterialWithDates = VaultKeyMaterial & { createdAt: Date; updatedAt: Date };

function SectionCard({
  icon,
  title,
  description,
  children,
  tone = "bg-primary/12 text-primary",
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <Card className="gap-5">
      <CardHeader className="flex items-start gap-4">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          {icon}
        </span>
        <div className="space-y-1.5">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription className="leading-6">{description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export function VaultSettings({
  material,
  records,
  entries,
  projects,
  clients,
  account,
  fmt,
}: {
  material: MaterialWithDates;
  records: VaultItemRecord[];
  entries: VaultEntry[];
  projects: LinkOption[];
  clients: LinkOption[];
  account: string;
  fmt: FormatOptions;
}) {
  const t = useT();
  const v = t.vault;
  const locale = useLocale();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        icon={<ShieldCheckIcon className="size-5" />}
        title={v.securityTitle}
        description={v.securityBody}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
          <dt className="text-muted-foreground">{v.cipherLabel}</dt>
          <dd dir="ltr" className="text-end font-semibold rtl:text-start">
            AES-256-GCM
          </dd>
          <dt className="text-muted-foreground">{v.kdfLabel}</dt>
          <dd dir="ltr" className="text-end font-semibold rtl:text-start">
            {material.kdf}
          </dd>
          <dt className="text-muted-foreground">{v.iterationsLabel}</dt>
          <dd className="font-semibold">{formatNumber(material.iterations, locale)}</dd>
          <dt className="text-muted-foreground">{v.autoLockLabel}</dt>
          <dd className="font-semibold">{v.autoLockValue}</dd>
          <dt className="text-muted-foreground">{v.itemsLabel}</dt>
          <dd className="font-semibold">{formatNumber(records.length, locale)}</dd>
          <dt className="text-muted-foreground">{v.vaultCreatedAt}</dt>
          <dd className="font-semibold">{formatDateTime(material.createdAt, fmt)}</dd>
          <dt className="text-muted-foreground">{v.keysChangedAt}</dt>
          <dd className="font-semibold">{formatDateTime(material.updatedAt, fmt)}</dd>
        </dl>
      </SectionCard>

      <ChangePasswordCard material={material} />
      <RecoveryCard material={material} account={account} />
      <BackupCard material={material} records={records} />
      <PlainExportCard
        material={material}
        entries={entries}
        projects={projects}
        clients={clients}
      />

      <SectionCard
        icon={<Trash2Icon className="size-5" />}
        title={v.dangerZone}
        description={v.dangerBody}
        tone="bg-destructive/12 text-destructive"
      >
        <ResetVaultDialog
          trigger={
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/8"
            >
              <Trash2Icon /> {v.resetVault}
            </Button>
          }
        />
      </SectionCard>
    </div>
  );
}

// ─── Change master password ─────────────────────────────────────────────────

function ChangePasswordCard({ material }: { material: VaultKeyMaterial }) {
  const t = useT();
  const v = t.vault;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState<MasterPasswordValue>({ password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [formKey, setFormKey] = useState(0);

  return (
    <SectionCard
      icon={<KeySquareIcon className="size-5" />}
      title={v.changePassword}
      description={v.changePasswordBody}
    >
      <form
        key={formKey}
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!current || !masterPasswordReady(next)) return;
          start(async () => {
            setError(null);
            try {
              const vaultKey = await unlockWithPassword(material, current, true);
              const master = await wrapWithPassword(vaultKey, next.password);
              const res = await updateVaultKeysAction({ master });
              if (!res.ok) return void toast.error(res.error.message);
              toast.success(v.passwordChanged);
              setCurrent("");
              setNext({ password: "", confirm: "" });
              setFormKey((k) => k + 1);
            } catch (err) {
              setError(
                err instanceof VaultCryptoError && err.code === "bad_secret"
                  ? v.wrongPassword
                  : v.cryptoError,
              );
            }
          });
        }}
      >
        <Field label={v.currentPassword} htmlFor="vault-current" error={error}>
          <PasswordInput
            id="vault-current"
            value={current}
            onChange={(val) => {
              setCurrent(val);
              setError(null);
            }}
            autoComplete="off"
            invalid={!!error}
          />
        </Field>
        <MasterPasswordFields value={next} onChange={setNext} label={v.newMasterPassword} />
        <Button
          type="submit"
          className="w-fit"
          disabled={!current || !masterPasswordReady(next) || pending}
        >
          {pending && <Loader2Icon className="animate-spin" />}
          {v.changePassword}
        </Button>
      </form>
    </SectionCard>
  );
}

// ─── Recovery key ───────────────────────────────────────────────────────────

function RecoveryCard({ material, account }: { material: VaultKeyMaterial; account: string }) {
  const t = useT();
  const v = t.vault;
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const hasRecovery = !!material.recoveryWrappedKey;

  const reset = () => {
    setPassword("");
    setVaultKey(null);
    setRecoveryKey(null);
    setSaved(false);
    setError(null);
  };

  return (
    <SectionCard
      icon={<KeySquareIcon className="size-5" />}
      title={v.regenerateRecovery}
      description={v.regenerateRecoveryBody}
      tone="bg-warning/16 text-[#b76e00] dark:text-warning"
    >
      {!hasRecovery && (
        <p className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          <TriangleAlertIcon className="size-4 shrink-0" /> {v.noRecoveryKey}
        </p>
      )}
      <Button variant="outline" onClick={() => setOpen(true)}>
        <KeySquareIcon /> {v.regenerateRecovery}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{v.regenerateRecovery}</DialogTitle>
            <DialogDescription>
              {recoveryKey ? v.recoveryTitle : v.confirmWithPassword}
            </DialogDescription>
          </DialogHeader>
          {!recoveryKey ? (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  try {
                    setVaultKey(await unlockWithPassword(material, password, true));
                    setRecoveryKey(generateRecoveryKey());
                    setPassword("");
                  } catch (err) {
                    setError(
                      err instanceof VaultCryptoError && err.code === "bad_secret"
                        ? v.wrongPassword
                        : v.cryptoError,
                    );
                  }
                });
              }}
            >
              <Field label={v.masterPassword} htmlFor="vault-rk-pw" error={error}>
                <PasswordInput
                  id="vault-rk-pw"
                  value={password}
                  onChange={(val) => {
                    setPassword(val);
                    setError(null);
                  }}
                  autoComplete="off"
                  autoFocus
                  invalid={!!error}
                />
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={!password || pending}>
                  {pending && <Loader2Icon className="animate-spin" />}
                  {v.continue}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="grid gap-5">
              <RecoveryKeyPanel
                recoveryKey={recoveryKey}
                account={account}
                saved={saved}
                onSavedChange={setSaved}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button
                  disabled={!saved || pending}
                  onClick={() =>
                    start(async () => {
                      if (!vaultKey) return;
                      const recovery = await wrapWithRecoveryKey(vaultKey, recoveryKey);
                      const res = await updateVaultKeysAction({ recovery });
                      if (!res.ok) return void toast.error(res.error.message);
                      toast.success(v.recoveryRotated);
                      setOpen(false);
                      reset();
                    })
                  }
                >
                  {pending && <Loader2Icon className="animate-spin" />}
                  {t.common.save}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

// ─── Encrypted backup / restore ─────────────────────────────────────────────

function BackupCard({
  material,
  records,
}: {
  material: VaultKeyMaterial;
  records: VaultItemRecord[];
}) {
  const t = useT();
  const v = t.vault;
  const locale = useLocale();
  const key = useVaultKey();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<VaultBackup | null>(null);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const exportBackup = () => {
    const backup: VaultBackup = {
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      keys: {
        kdf: material.kdf,
        iterations: material.iterations,
        salt: material.salt,
        wrappedKey: material.wrappedKey,
        wrapIv: material.wrapIv,
        recoverySalt: material.recoverySalt,
        recoveryWrappedKey: material.recoveryWrappedKey,
        recoveryIv: material.recoveryIv,
      },
      items: records.map((r) => ({
        id: r.id,
        type: r.type,
        projectId: r.projectId,
        clientId: r.clientId,
        favorite: r.favorite,
        ciphertext: r.ciphertext,
        iv: r.iv,
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      })),
    };
    downloadText(
      `good-team-vault-backup-${today()}.json`,
      JSON.stringify(backup, null, 2),
      "application/json",
    );
  };

  /** Re-encrypt every item with the current key (decrypting with `backupKey` when needed). */
  const restore = async (backup: VaultBackup, backupKey: CryptoKey | null) => {
    const items = [];
    for (const it of backup.items) {
      if (!isVaultItemType(it.type)) continue;
      let payload: unknown;
      try {
        await decryptItem(key, it); // same vault key → keep ciphertext as is
        items.push({
          id: it.id,
          type: it.type,
          projectId: it.projectId,
          clientId: it.clientId,
          favorite: it.favorite,
          ciphertext: it.ciphertext,
          iv: it.iv,
        });
        continue;
      } catch {
        if (!backupKey) return false; // needs the backup's secret
      }
      try {
        payload = await decryptItem(backupKey, it);
      } catch {
        continue; // damaged item: skip
      }
      const blob = await encryptItem(key, payload);
      items.push({
        id: it.id,
        type: it.type,
        projectId: it.projectId,
        clientId: it.clientId,
        favorite: it.favorite,
        ...blob,
      });
    }
    const res = await importVaultItemsAction({ items });
    if (!res.ok) {
      toast.error(res.error.message);
      return true;
    }
    toast.success(
      format(v.importDone, {
        imported: formatNumber(res.data.imported, locale),
        skipped: formatNumber(res.data.skipped, locale),
      }),
    );
    return true;
  };

  const onFile = (file: File) =>
    start(async () => {
      let backup: VaultBackup | null = null;
      try {
        backup = parseBackup(JSON.parse(await file.text()));
      } catch {
        backup = null;
      }
      if (!backup) return void toast.error(v.importInvalid);
      if (backup.items.length === 0) return void toast.info(v.importEmpty);
      const done = await restore(backup, null);
      if (!done) setPendingBackup(backup); // ask for the backup's master password / recovery key
    });

  const unlockBackup = () =>
    start(async () => {
      if (!pendingBackup) return;
      setError(null);
      let backupKey: CryptoKey | null = null;
      try {
        backupKey = await unlockWithPassword(pendingBackup.keys, secret);
      } catch {
        if (parseRecoveryKey(secret)) {
          try {
            backupKey = await unlockWithRecoveryKey(pendingBackup.keys, secret);
          } catch {
            backupKey = null;
          }
        }
      }
      if (!backupKey) return void setError(v.wrongPassword);
      await restore(pendingBackup, backupKey);
      setPendingBackup(null);
      setSecret("");
    });

  return (
    <SectionCard
      icon={<DownloadIcon className="size-5" />}
      title={v.backupTitle}
      description={v.backupBody}
      tone="bg-info/12 text-info"
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportBackup}>
          <DownloadIcon /> {v.exportEncrypted}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
          {pending ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
          {pending ? v.importing : v.importEncrypted}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          data-testid="vault-import-file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
      </div>
      <Dialog
        open={!!pendingBackup}
        onOpenChange={(o) => {
          if (!o) {
            setPendingBackup(null);
            setSecret("");
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{v.importEncrypted}</DialogTitle>
            <DialogDescription className="leading-6">{v.importNeedsSecret}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (secret) unlockBackup();
            }}
          >
            <Field label={v.backupSecret} htmlFor="vault-backup-secret" error={error}>
              <PasswordInput
                id="vault-backup-secret"
                value={secret}
                onChange={(val) => {
                  setSecret(val);
                  setError(null);
                }}
                autoComplete="off"
                autoFocus
                invalid={!!error}
              />
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={!secret || pending}>
                {pending && <Loader2Icon className="animate-spin" />}
                {v.importEncrypted}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

// ─── Decrypted export ───────────────────────────────────────────────────────

function PlainExportCard({
  material,
  entries,
  projects,
  clients,
}: {
  material: VaultKeyMaterial;
  entries: VaultEntry[];
  projects: LinkOption[];
  clients: LinkOption[];
}) {
  const t = useT();
  const v = t.vault;
  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const nameOf = (list: LinkOption[], id: string | null) =>
    id ? (list.find((x) => x.id === id)?.name ?? "") : "";

  const run = (kind: "csv" | "json") =>
    start(async () => {
      setError(null);
      try {
        // Re-confirm the master password: an unattended unlocked tab shouldn't be enough.
        await unlockWithPassword(material, password);
      } catch {
        return void setError(v.wrongPassword);
      }
      const readable = entries.filter((e) => e.payload);
      if (kind === "json") {
        const data = {
          source: "Good Team vault",
          exportedAt: new Date().toISOString(),
          items: readable.map((e) => ({
            type: e.payload!.type,
            title: e.payload!.title,
            favorite: e.favorite,
            project: nameOf(projects, e.projectId) || null,
            client: nameOf(clients, e.clientId) || null,
            fields: e.payload!.fields,
            customFields: e.payload!.custom,
            env: e.payload!.env,
            createdAt: new Date(e.createdAt).toISOString(),
            updatedAt: new Date(e.updatedAt).toISOString(),
          })),
        };
        downloadText(
          `good-team-vault-UNENCRYPTED-${today()}.json`,
          JSON.stringify(data, null, 2),
          "application/json",
        );
      } else {
        const main = ["url", "username", "password", "totp", "notes"] as const;
        const rows = readable.map((e) => {
          const p = e.payload!;
          const extra: Record<string, unknown> = {};
          for (const f of TYPE_FIELDS[p.type]) {
            if (!(main as readonly string[]).includes(f.key) && p.fields[f.key])
              extra[f.key] = p.fields[f.key];
          }
          if (p.custom.length) extra.customFields = p.custom;
          if (p.env.length) extra.env = p.env;
          return [
            p.type,
            p.title,
            p.fields.url ?? p.fields.panelUrl ?? "",
            p.fields.username ?? p.fields.user ?? "",
            p.fields.password ?? "",
            p.fields.totp ?? "",
            p.fields.notes ?? p.fields.note ?? "",
            nameOf(projects, e.projectId),
            nameOf(clients, e.clientId),
            e.favorite ? "1" : "0",
            Object.keys(extra).length ? JSON.stringify(extra) : "",
          ];
        });
        const csv = toCsv(
          [
            "type",
            "title",
            "url",
            "username",
            "password",
            "totp",
            "notes",
            "project",
            "client",
            "favorite",
            "extra",
          ],
          rows,
        );
        downloadText(`good-team-vault-UNENCRYPTED-${today()}.csv`, `﻿${csv}`, "text/csv");
      }
      toast.warning(v.exportDone);
      setOpen(false);
      setPassword("");
      setUnderstood(false);
    });

  return (
    <SectionCard
      icon={<FileWarningIcon className="size-5" />}
      title={v.exportPlain}
      description={v.exportPlainBody}
      tone="bg-destructive/12 text-destructive"
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileWarningIcon /> {v.exportPlain}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setPassword("");
            setUnderstood(false);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlertIcon className="size-5" /> {v.exportPlainWarningTitle}
            </DialogTitle>
            <DialogDescription className="leading-7">{v.exportPlainWarning}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-semibold">
              <Checkbox
                checked={understood}
                onCheckedChange={(c) => setUnderstood(c === true)}
                className="mt-0.5"
              />
              {v.exportPlainConfirm}
            </label>
            <Field label={v.confirmWithPassword} htmlFor="vault-export-pw" error={error}>
              <PasswordInput
                id="vault-export-pw"
                value={password}
                onChange={(val) => {
                  setPassword(val);
                  setError(null);
                }}
                autoComplete="off"
                invalid={!!error}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            {(["csv", "json"] as const).map((kind) => (
              <Button
                key={kind}
                variant="destructive"
                disabled={!understood || !password || pending}
                onClick={() => run(kind)}
              >
                {pending ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
                {format(v.exportAs, { format: kind.toUpperCase() })}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
