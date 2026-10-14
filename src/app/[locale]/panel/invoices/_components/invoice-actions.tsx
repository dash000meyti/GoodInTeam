"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BanIcon,
  BanknoteIcon,
  CopyIcon,
  CopyPlusIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PrinterIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import {
  deleteInvoiceAction,
  duplicateInvoiceAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/server/modules/finance/actions";
import type { InvoiceStatus } from "@/server/db/schema/finance";
import { PaymentDialog, type PaymentAccount } from "./payment-dialog";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Header actions of the invoice detail page (owner/admin). */
export function InvoiceActions({
  invoice,
  publicUrl,
  accounts,
}: {
  invoice: { id: string; number: string; status: InvoiceStatus; currency: string; dueMinor: number };
  publicUrl: string | null;
  accounts: PaymentAccount[];
}) {
  const t = useT();
  const f = t.finance;
  const locale = useLocale();
  const router = useRouter();
  const { exec, pending } = useAction();
  const [sending, start] = useTransition();
  const editable = invoice.status !== "paid" && invoice.status !== "void";
  const payable = editable;

  const send = () =>
    start(async () => {
      const res = await sendInvoiceAction({ id: invoice.id });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success((await copy(res.data.url)) ? f.linkReady : t.common.saved);
    });

  return (
    <>
      {invoice.status === "draft" ? (
        <Button onClick={send} disabled={sending}>
          {sending ? <Loader2Icon className="animate-spin" /> : <SendIcon className="rtl:-scale-x-100" />}
          {f.sendInvoice}
        </Button>
      ) : (
        publicUrl && (
          <Button
            variant="outline"
            onClick={async () => toast.success((await copy(publicUrl)) ? t.common.copied : publicUrl)}
          >
            <CopyIcon /> {f.copyLink}
          </Button>
        )
      )}
      {payable && (
        <PaymentDialog
          invoiceId={invoice.id}
          currency={invoice.currency}
          dueMinor={invoice.dueMinor}
          accounts={accounts}
          trigger={
            <Button variant={invoice.status === "draft" ? "outline" : "default"}>
              <BanknoteIcon /> {f.recordPayment}
            </Button>
          }
        />
      )}
      {editable && (
        <Button asChild variant="outline">
          <Link href={localePath(locale, `/panel/invoices/${invoice.id}/edit`)}>
            <PencilIcon /> {t.common.edit}
          </Link>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label={t.common.actions} disabled={pending}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {publicUrl && (
            <DropdownMenuItem asChild>
              <a href={publicUrl} target="_blank" rel="noopener">
                <ExternalLinkIcon /> {f.openPublic}
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => window.print()}>
            <PrinterIcon /> {f.print}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              exec(
                duplicateInvoiceAction({ id: invoice.id }).then((r) => {
                  if (r.ok) router.push(localePath(locale, `/panel/invoices/${r.data.id}/edit`));
                  return r;
                }),
                f.duplicated,
              )
            }
          >
            <CopyPlusIcon /> {f.duplicate}
          </DropdownMenuItem>
          {invoice.status !== "void" && <DropdownMenuSeparator />}
          {invoice.status !== "void" && invoice.status !== "draft" && (
            <ConfirmDialog
              title={f.voidInvoice}
              description={f.voidHint}
              confirmLabel={f.voidInvoice}
              onConfirm={() => exec(voidInvoiceAction({ id: invoice.id }), t.common.saved)}
              trigger={
                <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                  <BanIcon /> {f.voidInvoice}
                </DropdownMenuItem>
              }
            />
          )}
          {invoice.status === "draft" && (
            <ConfirmDialog
              description={f.deleteInvoiceHint}
              onConfirm={() =>
                exec(
                  deleteInvoiceAction({ id: invoice.id }).then((r) => {
                    if (r.ok) router.push(localePath(locale, "/panel/invoices"));
                    return r;
                  }),
                  t.common.saved,
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
    </>
  );
}
