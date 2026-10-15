"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { format } from "@/i18n/format-message";
import { useT } from "@/i18n/client";
import { resetVaultAction } from "@/server/modules/vault/actions";
import { useVault } from "./vault-provider";

/** Typed-confirmation dialog that erases the whole vault (keys + items). */
export function ResetVaultDialog({ trigger }: { trigger: ReactNode }) {
  const t = useT();
  const v = t.vault;
  const vault = useVault();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const matches = typed.trim().toLowerCase() === v.resetWord.toLowerCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setTyped("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">{v.resetTitle}</DialogTitle>
          <DialogDescription className="leading-7">{v.resetBody}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!matches) return;
            start(async () => {
              const res = await resetVaultAction({ confirm: true });
              if (!res.ok) {
                toast.error(res.error.message);
                return;
              }
              vault.lock("manual", true);
              setOpen(false);
              toast.success(v.resetDone);
            });
          }}
        >
          <Field label={format(v.resetConfirmLabel, { word: v.resetWord })} htmlFor="vault-reset">
            <Input
              id="vault-reset"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="destructive" disabled={!matches || pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              {v.resetVault}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
