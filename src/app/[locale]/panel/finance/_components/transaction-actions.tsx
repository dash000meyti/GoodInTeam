"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction } from "@/components/shared/use-action-form";
import { format } from "@/i18n/format-message";
import { useT } from "@/i18n/client";
import { deleteTransactionAction } from "@/server/modules/finance/actions";
import type { TxFormOptions, TxFormValues } from "../_lib/options";
import { TransactionFormDialog } from "./transaction-form";

/** Row actions: edit (dialog) + delete (confirm). */
export function TransactionActions({
  transaction,
  options,
}: {
  transaction: TxFormValues;
  options: TxFormOptions;
}) {
  const t = useT();
  const f = t.finance;
  const { exec, pending } = useAction();
  return (
    <div className="flex items-center justify-end gap-0.5">
      <TransactionFormDialog
        transaction={transaction}
        options={options}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t.common.edit}>
            <PencilIcon />
          </Button>
        }
      />
      <ConfirmDialog
        description={
          transaction.invoiceNumber
            ? format(f.deleteTxInvoiceHint, { number: transaction.invoiceNumber })
            : f.deleteTxHint
        }
        onConfirm={() => exec(deleteTransactionAction({ id: transaction.id }), t.common.saved)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t.common.delete} disabled={pending}>
            <Trash2Icon className="text-destructive" />
          </Button>
        }
      />
    </div>
  );
}
