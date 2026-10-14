"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckIcon,
  Loader2Icon,
  PenLineIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/contracts/signature-pad";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  declineContractAction,
  signContractAction,
} from "@/server/modules/contracts/public-actions";

export interface SignTarget {
  id: string;
  token: string;
  contentHash: string;
  version: number;
  requireSignature: boolean;
  defaultName: string;
  defaultEmail: string;
  brandName: string;
  /** Owner/admin previewing the link: everything is disabled. */
  preview: boolean;
}

export const SIGNED_FLAG = "gt-contract-signed:";

type Outcome = "changed" | "expired" | "closed" | "not_found";

function OutcomeAlert({ outcome }: { outcome: Outcome }) {
  const t = useT();
  const c = t.contracts;
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm"
    >
      <p className="flex gap-2">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[#b76e00] dark:text-warning" />
        <span>{c[`outcome_${outcome}`]}</span>
      </p>
      {outcome === "changed" && (
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          <RefreshCwIcon /> {c.reload}
        </Button>
      )}
    </div>
  );
}

/** The signing form (used in the desktop sidebar and the mobile bottom sheet). */
export function SignForm({ target, idPrefix }: { target: SignTarget; idPrefix: string }) {
  const t = useT();
  const locale = useLocale();
  const c = t.contracts;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(target.defaultName);
  const [email, setEmail] = useState(target.defaultEmail);
  const [typed, setTyped] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [tried, setTried] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const nameOk = name.trim().length >= 2;
  const sigOk = !target.requireSignature || !!image || typed.trim().length >= 2;
  const ready = nameOk && sigOk && consent && !target.preview;
  const flag = SIGNED_FLAG + target.id;

  const submit = () => {
    setTried(true);
    if (!ready) return;
    start(async () => {
      setOutcome(null);
      try {
        sessionStorage.setItem(flag, String(Date.now()));
      } catch {}
      const res = await signContractAction({
        token: target.token,
        name: name.trim(),
        email: email.trim(),
        typedName: target.requireSignature ? typed.trim() || undefined : undefined,
        signatureImage: target.requireSignature ? (image ?? undefined) : undefined,
        consent: true,
        contentHash: target.contentHash,
        version: target.version,
      });
      if (res.ok && res.data.outcome === "signed") {
        router.refresh();
        return;
      }
      try {
        sessionStorage.removeItem(flag);
      } catch {}
      if (res.ok) setOutcome(res.data.outcome as Outcome);
      else {
        setErrors(res.error.fieldErrors ?? {});
        if (!res.error.fieldErrors) toast.error(res.error.message);
      }
    });
  };

  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <div className="grid gap-4">
      <Field
        label={c.fullName}
        htmlFor={id("name")}
        required
        error={(tried && !nameOk ? t.common.required : undefined) ?? errors.name?.[0]}
      >
        <Input
          id={id("name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          dir="auto"
          disabled={target.preview}
        />
      </Field>
      <Field label={c.emailOptional} htmlFor={id("email")} error={errors.email?.[0]}>
        <Input
          id={id("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={target.preview}
        />
      </Field>

      {target.requireSignature && (
        <div className="grid gap-2">
          <p className="text-sm font-semibold">
            {c.drawSignature}
            <span className="text-destructive">*</span>
          </p>
          <SignaturePad
            label={c.signaturePadLabel}
            hint={c.drawHint}
            clearLabel={c.clearSignature}
            placeholder={c.signHere}
            onChange={setImage}
            disabled={target.preview}
            invalid={tried && !sigOk}
            height={170}
          />
          <Field label={c.typeSignature} htmlFor={id("typed")}>
            <Input
              id={id("typed")}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={c.typedPlaceholder}
              dir="auto"
              className="font-serif text-lg italic"
              disabled={target.preview}
            />
          </Field>
          {tried && !sigOk && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {c.signatureMissing}
            </p>
          )}
          {errors.signatureImage?.[0] && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.signatureImage[0]}
            </p>
          )}
        </div>
      )}

      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-6 transition-colors",
          consent ? "border-primary/50 bg-primary/5" : "border-border bg-muted/50",
          tried && !consent && "border-destructive/60",
        )}
      >
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-1"
          disabled={target.preview}
          aria-invalid={tried && !consent}
        />
        <span>
          {format(target.requireSignature ? c.consentSign : c.consentApprove, {
            n: formatNumber(target.version, locale),
          })}
        </span>
      </label>

      {outcome && <OutcomeAlert outcome={outcome} />}

      <Button size="lg" className="w-full" onClick={submit} disabled={pending || target.preview}>
        {pending ? (
          <Loader2Icon className="animate-spin" />
        ) : target.requireSignature ? (
          <PenLineIcon />
        ) : (
          <CheckIcon />
        )}
        {pending ? c.submitting : target.requireSignature ? c.signButton : c.approveButton}
      </Button>
      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        {c.evidenceNote}
      </p>
      <DeclineDialog target={target} />
    </div>
  );
}

function DeclineDialog({ target }: { target: SignTarget }) {
  const t = useT();
  const c = t.contracts;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const submit = () =>
    start(async () => {
      const res = await declineContractAction({
        token: target.token,
        reason: reason.trim() || undefined,
        contentHash: target.contentHash,
        version: target.version,
      });
      if (res.ok && res.data.outcome === "declined") {
        setOpen(false);
        router.refresh();
      } else if (res.ok) setOutcome(res.data.outcome as Outcome);
      else toast.error(res.error.message);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-center text-muted-foreground hover:text-destructive"
          disabled={target.preview}
        >
          <XCircleIcon /> {c.declineButton}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c.declineTitle}</DialogTitle>
          <DialogDescription>
            {format(c.declineHint, { brand: target.brandName })}
          </DialogDescription>
        </DialogHeader>
        <Field label={c.declineReason} htmlFor="decline-reason">
          <Textarea
            id="decline-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={2000}
            dir="auto"
          />
        </Field>
        {outcome && <OutcomeAlert outcome={outcome} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <XCircleIcon />}
            {c.declineConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Mobile: a fixed bottom bar that opens the signing form in a bottom sheet. */
export function MobileSignBar({ target, status }: { target: SignTarget; status: string }) {
  const t = useT();
  const locale = useLocale();
  const c = t.contracts;
  const [open, setOpen] = useState(false);
  return (
    <div
      data-print-hide
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-dropdown backdrop-blur lg:hidden dark:bg-card/95 print:hidden"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{status}</p>
          <p className="text-xs text-muted-foreground">
            {format(c.versionN, { n: formatNumber(target.version, locale) })}
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="shrink-0" disabled={target.preview}>
              {target.requireSignature ? <PenLineIcon /> : <CheckIcon />}
              {target.requireSignature ? c.mobileBarSign : c.mobileBarApprove}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[92dvh] gap-0 overflow-y-auto p-0">
            <SheetHeader className="border-b border-dashed px-5 pt-5 pb-4">
              <SheetTitle className="text-lg">
                {target.requireSignature ? c.signPanelTitle : c.approvePanelTitle}
              </SheetTitle>
              <SheetDescription>
                {target.requireSignature ? c.signPanelHint : c.approvePanelHint}
              </SheetDescription>
            </SheetHeader>
            <div className="p-5">
              <SignForm target={target} idPrefix="m" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
