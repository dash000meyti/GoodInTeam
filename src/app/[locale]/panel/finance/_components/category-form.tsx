"use client";

import { useState, type ReactNode } from "react";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
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
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { SelectField } from "@/components/shared/select-field";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/server/modules/finance/actions";
import { ColorPicker } from "../../projects/_components/color-picker";

export interface CategoryFormValues {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string | null;
}

export function CategoryFormDialog({
  trigger,
  category,
  defaultKind = "expense",
}: {
  trigger: ReactNode;
  category?: CategoryFormValues;
  defaultKind?: "income" | "expense";
}) {
  const t = useT();
  const f = t.finance;
  const [open, setOpen] = useState(false);
  const form = useActionForm(category ? updateCategoryAction : createCategoryAction, {
    successMessage: t.common.saved,
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        form.reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? f.editCategory : f.newCategory}</DialogTitle>
        </DialogHeader>
        <form action={form.submit} className="grid gap-4">
          {category && <input type="hidden" name="id" value={category.id} />}
          <Field label={f.categoryName} htmlFor="cat-name" error={form.errors.name?.[0]} required>
            <Input id="cat-name" name="name" defaultValue={category?.name} required autoFocus />
          </Field>
          <Field label={f.categoryKind} error={form.errors.kind?.[0]}>
            <SelectField
              name="kind"
              defaultValue={category?.kind ?? defaultKind}
              options={[
                { value: "income", label: f.kind_income },
                { value: "expense", label: f.kind_expense },
              ]}
            />
          </Field>
          <Field label={t.projects.color}>
            <ColorPicker name="color" defaultValue={category?.color ?? undefined} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
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

export function CategoryActions({ category }: { category: CategoryFormValues }) {
  const t = useT();
  const { exec, pending } = useAction();
  return (
    <div className="flex items-center gap-0.5">
      <CategoryFormDialog
        category={category}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t.common.edit}>
            <PencilIcon />
          </Button>
        }
      />
      <ConfirmDialog
        description={t.finance.deleteCategoryHint}
        onConfirm={() => exec(deleteCategoryAction({ id: category.id }), t.common.saved)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t.common.delete} disabled={pending}>
            <Trash2Icon className="text-destructive" />
          </Button>
        }
      />
    </div>
  );
}
