"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  FolderKanbanIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { format } from "@/i18n/format-message";
import { useT } from "@/i18n/client";
import { formatDateTime, type FormatOptions } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteVaultItemAction,
  favoriteVaultItemAction,
  viewVaultItemAction,
} from "@/server/modules/vault/actions";
import { useVaultCopy } from "./clipboard";
import { downloadText, serializeEnv } from "./formats";
import {
  safeHref,
  TYPE_FIELDS,
  TYPE_ICONS,
  TYPE_TONES,
  type FieldDef,
  type VaultEntry,
} from "./item-types";
import { StrengthMeter } from "./strength-meter";
import { TotpCode } from "./totp-code";

export interface LinkOption {
  id: string;
  name: string;
  color?: string | null;
}

function Row({
  label,
  children,
  actions,
}: {
  label: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="group grid gap-1.5 border-b border-dashed px-1 py-3 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {actions && <div className="flex items-center gap-0.5">{actions}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function maskOf(value: string, multiline: boolean) {
  if (multiline) return "•".repeat(24);
  return "•".repeat(Math.min(Math.max(value.length, 8), 24));
}

/** A secret value with reveal toggle and auto-clearing copy. */
function SecretRow({
  label,
  value,
  multiline,
  strength,
  format: fmtValue,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  strength?: boolean;
  format?: (v: string) => string;
}) {
  const t = useT();
  const copy = useVaultCopy();
  const [shown, setShown] = useState(false);
  return (
    <Row
      label={label}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? t.vault.hide : t.vault.reveal}
            aria-pressed={shown}
          >
            {shown ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => copy.secret(value)}
            aria-label={format(t.vault.copyValue, { field: label })}
          >
            <CopyIcon />
          </Button>
        </>
      }
    >
      <div
        dir="ltr"
        className={cn(
          "font-mono text-sm break-all",
          multiline &&
            shown &&
            "max-h-60 overflow-auto rounded-lg bg-muted/60 p-3 text-xs whitespace-pre",
          !shown && "tracking-widest text-muted-foreground",
        )}
      >
        {shown ? (fmtValue ? fmtValue(value) : value) : maskOf(value, !!multiline)}
      </div>
      {strength && <StrengthMeter password={value} showWarning={false} className="mt-1 max-w-56" />}
    </Row>
  );
}

function PlainRow({
  label,
  value,
  ltr,
  mono,
  copyable = true,
}: {
  label: string;
  value: string;
  ltr?: boolean;
  mono?: boolean;
  copyable?: boolean;
}) {
  const t = useT();
  const copy = useVaultCopy();
  return (
    <Row
      label={label}
      actions={
        copyable && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => copy.plain(value)}
            aria-label={format(t.vault.copyValue, { field: label })}
          >
            <CopyIcon />
          </Button>
        )
      }
    >
      <p
        dir={ltr ? "ltr" : "auto"}
        className={cn("text-sm break-words", ltr && "text-start", mono && "font-mono")}
      >
        {value}
      </p>
    </Row>
  );
}

const MONO_FIELDS = new Set<string>(["host", "port", "database", "user", "expiry"]);

const cardNumber = (v: string) => v.replace(/\D/g, "").replace(/(.{4})(?=.)/g, "$1 ");

function FieldView({ def, value }: { def: FieldDef; value: string }) {
  const t = useT();
  const copy = useVaultCopy();
  const label = t.vault[`field_${def.key}`];
  switch (def.kind) {
    case "secret":
      return (
        <SecretRow
          label={label}
          value={value}
          strength={def.key === "password" || def.key === "passphrase"}
          format={def.key === "number" ? cardNumber : undefined}
        />
      );
    case "secretMultiline":
      return <SecretRow label={label} value={value} multiline />;
    case "totp":
      return (
        <Row label={t.vault.oneTimeCode}>
          <TotpCode secret={value} />
        </Row>
      );
    case "url": {
      const href = safeHref(value);
      return (
        <Row
          label={label}
          actions={
            <>
              {href && (
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.vault.openUrl}
                  >
                    <ExternalLinkIcon />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => copy.plain(value)}
                aria-label={format(t.vault.copyValue, { field: label })}
              >
                <CopyIcon />
              </Button>
            </>
          }
        >
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="block text-start text-sm font-semibold break-all text-primary hover:underline"
            >
              {value}
            </a>
          ) : (
            <p dir="ltr" className="text-start text-sm break-all">
              {value}
            </p>
          )}
        </Row>
      );
    }
    case "multiline":
      return (
        <Row label={label}>
          <p dir="auto" className="text-sm leading-7 whitespace-pre-wrap">
            {value}
          </p>
        </Row>
      );
    default:
      return (
        <PlainRow
          label={label}
          value={value}
          ltr={def.key !== "holder"}
          mono={MONO_FIELDS.has(def.key)}
        />
      );
  }
}

/** Side drawer showing one decrypted item. */
export function ItemDetail({
  entry,
  open,
  onOpenChange,
  onEdit,
  projects,
  clients,
  fmt,
}: {
  entry: VaultEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (entry: VaultEntry) => void;
  projects: LinkOption[];
  clients: LinkOption[];
  fmt: FormatOptions;
}) {
  const t = useT();
  const v = t.vault;
  const copy = useVaultCopy();
  const viewed = useRef<string | null>(null);

  // Stamp "last viewed" once per opening (fire-and-forget, no refresh).
  useEffect(() => {
    if (!open || !entry || viewed.current === entry.id) return;
    viewed.current = entry.id;
    void viewVaultItemAction({ id: entry.id });
  }, [open, entry]);
  useEffect(() => {
    if (!open) viewed.current = null;
  }, [open]);

  const p = entry?.payload;
  const type = p?.type ?? entry?.type ?? "other";
  const Icon = TYPE_ICONS[type];
  const project = entry?.projectId ? projects.find((x) => x.id === entry.projectId) : null;
  const client = entry?.clientId ? clients.find((x) => x.id === entry.clientId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        {entry && (
          <Fragment key={entry.id}>
            <SheetHeader className="border-b border-dashed p-5 pe-12">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl",
                    TYPE_TONES[type],
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-lg" dir="auto">
                    {p ? p.title || v.untitled : v.unreadable}
                  </SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-1.5">
                    <span>{v[`type_${type}`]}</span>
                  </SheetDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={entry.favorite ? v.removeFavorite : v.addFavorite}
                  aria-pressed={entry.favorite}
                  onClick={async () => {
                    const res = await favoriteVaultItemAction({
                      id: entry.id,
                      favorite: !entry.favorite,
                    });
                    if (!res.ok) toast.error(res.error.message);
                  }}
                >
                  <StarIcon className={cn(entry.favorite && "fill-warning text-warning")} />
                </Button>
              </div>
              {(project || client) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project && (
                    <Badge variant="neutral">
                      <FolderKanbanIcon /> {project.name}
                    </Badge>
                  )}
                  {client && (
                    <Badge variant="neutral">
                      <UsersIcon /> {client.name}
                    </Badge>
                  )}
                </div>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {!p ? (
                <p className="p-4 text-sm text-muted-foreground">{v.unreadableHint}</p>
              ) : (
                <>
                  {TYPE_FIELDS[p.type].map((def) => {
                    const value = p.fields[def.key];
                    return value ? <FieldView key={def.key} def={def} value={value} /> : null;
                  })}
                  {p.type === "env" && (
                    <div className="py-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {v.envVariables} ({p.env.length})
                        </span>
                        {p.env.length > 0 && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copy.secret(serializeEnv(p.env))}
                            >
                              <CopyIcon /> {v.copyEnv}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon-sm"
                              aria-label={v.downloadEnv}
                              onClick={() => downloadText(".env", `${serializeEnv(p.env)}\n`)}
                            >
                              <DownloadIcon />
                            </Button>
                          </div>
                        )}
                      </div>
                      {p.env.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{v.envEmpty}</p>
                      ) : (
                        <div className="rounded-xl border">
                          {p.env.map((e, i) => (
                            <SecretRow key={`${e.key}-${i}`} label={e.key} value={e.value} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {p.custom.length > 0 && (
                    <div className="pt-3">
                      <p className="mb-1 text-xs font-bold text-muted-foreground uppercase">
                        {v.customFields}
                      </p>
                      {p.custom.map((c, i) =>
                        c.concealed ? (
                          <SecretRow key={i} label={c.label || "—"} value={c.value} />
                        ) : (
                          <PlainRow key={i} label={c.label || "—"} value={c.value} />
                        ),
                      )}
                    </div>
                  )}
                </>
              )}
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-muted/50 p-3 text-xs">
                <dt className="text-muted-foreground">{v.createdAt}</dt>
                <dd>{formatDateTime(entry.createdAt, fmt)}</dd>
                <dt className="text-muted-foreground">{v.updatedAt}</dt>
                <dd>{formatDateTime(entry.updatedAt, fmt)}</dd>
                <dt className="text-muted-foreground">{v.lastViewed}</dt>
                <dd>{entry.lastViewedAt ? formatDateTime(entry.lastViewedAt, fmt) : v.never}</dd>
              </dl>
            </div>

            <SheetFooter className="flex-row gap-2 border-t border-dashed">
              {p && (
                <Button className="flex-1" onClick={() => onEdit(entry)}>
                  <PencilIcon /> {t.common.edit}
                </Button>
              )}
              <ConfirmDialog
                description={v.deleteItemBody}
                onConfirm={async () => {
                  const res = await deleteVaultItemAction({ id: entry.id });
                  if (res.ok) {
                    toast.success(v.itemDeleted);
                    onOpenChange(false);
                  } else toast.error(res.error.message);
                }}
                trigger={
                  <Button variant="outline" className={cn(!p && "flex-1")}>
                    <Trash2Icon className="text-destructive" /> {t.common.delete}
                  </Button>
                }
              />
            </SheetFooter>
          </Fragment>
        )}
      </SheetContent>
    </Sheet>
  );
}
