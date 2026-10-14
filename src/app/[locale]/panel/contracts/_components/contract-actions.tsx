"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  BellRingIcon,
  BookmarkPlusIcon,
  CircleSlashIcon,
  CopyPlusIcon,
  ExternalLinkIcon,
  Link2Icon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PenLineIcon,
  PrinterIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { DatePicker } from "@/components/shared/date-picker";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import {
  deleteContractAction,
  duplicateContractAction,
  remindContractAction,
  saveAsTemplateAction,
  sendContractAction,
  voidContractAction,
} from "@/server/modules/contracts/actions";
import { CountersignDialog } from "./countersign-dialog";
import { ShareDialog, type MessageLang, type ShareMessageParts } from "./share-dialog";

type Action =
  | "edit"
  | "send"
  | "remind"
  | "void"
  | "delete"
  | "duplicate"
  | "countersign"
  | "view"
  | "sign"
  | "decline";

export interface ContractActionsProps {
  id: string;
  title: string;
  status: "draft" | "sent" | "viewed" | "signed" | "declined" | "void" | "expired";
  version: number;
  requireSignature: boolean;
  actions: Action[];
  signUrl: string | null;
  signerName: string | null;
  /** "YYYY-MM-DD" for the send dialog's deadline picker. */
  expiresAt: string | null;
  unresolved: string[];
  messages: Record<MessageLang, ShareMessageParts>;
  docLocale: MessageLang;
  /** Owner already countersigned the current version. */
  countersigned: boolean;
  defaultSignerName: string;
}

export function ContractActions(p: ContractActionsProps) {
  const t = useT();
  const c = t.contracts;
  const locale = useLocale();
  const router = useRouter();
  const { exec, pending } = useAction();
  const [share, setShare] = useState<{ mode: "sign" | "remind"; url: string } | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [expiry, setExpiry] = useState<string | null>(p.expiresAt);
  const can = (a: Action) => p.actions.includes(a);
  const panel = (path: string) => localePath(locale, path);

  const send = useActionForm(sendContractAction, {
    onSuccess: (d) => {
      setSendOpen(false);
      toast.success(c.sentToast);
      if (d.signUrl) setShare({ mode: "sign", url: d.signUrl });
    },
  });
  const remind = useActionForm(remindContractAction, {
    onSuccess: (d) => {
      toast.success(c.reminded);
      if (d.signUrl) setShare({ mode: "remind", url: d.signUrl });
    },
  });

  const duplicate = (asNewVersion: boolean) =>
    exec(
      duplicateContractAction({ id: p.id, asNewVersion }).then((r) => {
        if (r.ok) router.push(panel(`/panel/contracts/${r.data.id}/edit`));
        return r;
      }),
      c.duplicated,
    );

  const pendingSign = p.status === "sent" || p.status === "viewed";

  return (
    <>
      {can("send") && p.status === "draft" && (
        <Button onClick={() => setSendOpen(true)}>
          <SendIcon className="rtl:-scale-x-100" /> {c.send}
        </Button>
      )}
      {pendingSign && p.signUrl && (
        <Button variant="outline" onClick={() => setShare({ mode: "sign", url: p.signUrl! })}>
          <Link2Icon /> {c.getLink}
        </Button>
      )}
      {can("remind") && (
        <Button
          variant="outline"
          disabled={remind.pending}
          onClick={() => remind.run({ id: p.id })}
        >
          {remind.pending ? <Loader2Icon className="animate-spin" /> : <BellRingIcon />}
          {c.remind}
        </Button>
      )}
      {can("edit") && (
        <Button asChild variant={p.status === "draft" ? "outline" : "ghost"}>
          <Link href={panel(`/panel/contracts/${p.id}/edit`)}>
            <PencilIcon /> {t.common.edit}
          </Link>
        </Button>
      )}
      {p.status === "signed" && (
        <Button asChild variant="outline">
          <Link href={panel(`/panel/contracts/${p.id}/print`)}>
            <PrinterIcon /> {c.print}
          </Link>
        </Button>
      )}
      {can("countersign") && !p.countersigned && p.status === "signed" && (
        <CountersignDialog
          id={p.id}
          version={p.version}
          defaultName={p.defaultSignerName}
          trigger={
            <Button variant="soft">
              <PenLineIcon /> {c.countersign}
            </Button>
          }
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label={c.moreActions} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <MoreHorizontalIcon />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {can("countersign") && !p.countersigned && p.status !== "signed" && (
            <CountersignDialog
              id={p.id}
              version={p.version}
              defaultName={p.defaultSignerName}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <PenLineIcon /> {c.countersign}
                </DropdownMenuItem>
              }
            />
          )}
          {p.status !== "signed" && (
            <DropdownMenuItem asChild>
              <Link href={panel(`/panel/contracts/${p.id}/print`)}>
                <PrinterIcon /> {c.print}
              </Link>
            </DropdownMenuItem>
          )}
          {p.signUrl && (
            <DropdownMenuItem asChild>
              <a href={p.signUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon /> {c.openSignPage}
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => duplicate(p.status === "signed")}>
            <CopyPlusIcon /> {p.status === "signed" ? c.duplicateAsNewVersion : c.duplicate}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => exec(saveAsTemplateAction({ id: p.id }), c.savedAsTemplate)}
          >
            <BookmarkPlusIcon /> {c.saveAsTemplate}
          </DropdownMenuItem>
          {(can("void") || can("delete")) && <DropdownMenuSeparator />}
          {can("void") && (
            <DropdownMenuItem variant="destructive" onSelect={() => setVoidOpen(true)}>
              <CircleSlashIcon /> {c.void}
            </DropdownMenuItem>
          )}
          {can("delete") && (
            <ConfirmDialog
              description={c.deleteDraftHint}
              onConfirm={() =>
                exec(
                  deleteContractAction({ id: p.id }).then((r) => {
                    if (r.ok) router.push(panel("/panel/contracts"));
                    return r;
                  }),
                  c.deleted,
                )
              }
              trigger={
                <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                  <Trash2Icon /> {t.common.delete}
                </DropdownMenuItem>
              }
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Draft → send confirmation */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{c.sendTitle}</DialogTitle>
            <DialogDescription>{c.sendHint}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {p.unresolved.length > 0 && (
              <p className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[#b76e00] dark:text-warning" />
                <span>
                  {format(c.unresolvedWarning, {
                    n: formatNumber(p.unresolved.length, locale),
                    list: p.unresolved.map((k) => `{{${k}}}`).join("، "),
                  })}
                </span>
              </p>
            )}
            {!p.signerName && <p className="text-xs text-muted-foreground">{c.noSignerWarning}</p>}
            <Field label={c.fieldExpires} hint={c.expiresHint} error={send.errors.expiresAt?.[0]}>
              <DatePicker value={expiry} onChange={setExpiry} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={send.pending}
              onClick={() => send.run({ id: p.id, expiresAt: expiry ?? "" })}
            >
              {send.pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SendIcon className="rtl:-scale-x-100" />
              )}
              {c.sendConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void with optional reason */}
      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c.voidConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{c.voidConfirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <Field label={c.voidReason}>
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setVoidOpen(false);
                exec(voidContractAction({ id: p.id, reason: voidReason }), c.voided);
              }}
            >
              <CircleSlashIcon /> {c.void}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {share && (
        <ShareDialog
          open
          onOpenChange={(o) => !o && setShare(null)}
          mode={share.mode}
          url={share.url}
          title={p.title}
          signerName={p.signerName}
          requireSignature={p.requireSignature}
          messages={p.messages}
          defaultLang={p.docLocale}
        />
      )}
    </>
  );
}
