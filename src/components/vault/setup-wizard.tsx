"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  CloudOffIcon,
  KeyRoundIcon,
  Loader2Icon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n/client";
import { createVaultKeys, type MasterWrap, type RecoveryWrap } from "@/lib/vault-crypto";
import { cn } from "@/lib/utils";
import { setupVaultAction } from "@/server/modules/vault/actions";
import {
  MasterPasswordFields,
  masterPasswordReady,
  type MasterPasswordValue,
} from "./master-password-fields";
import { RecoveryKeyPanel } from "./recovery-key-panel";
import { useVault } from "./vault-provider";

interface GeneratedKeys {
  material: MasterWrap & RecoveryWrap;
  recoveryKey: string;
  sessionKey: CryptoKey;
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => (
        <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
              i < current && "bg-primary text-primary-foreground",
              i === current &&
                "bg-primary/16 text-primary-dark ring-2 ring-primary dark:text-primary-light",
              i > current && "bg-muted text-muted-foreground",
            )}
            aria-current={i === current ? "step" : undefined}
          >
            {i + 1}
          </span>
          <span
            className={cn(
              "truncate text-xs font-semibold sm:text-sm",
              i === current ? "text-foreground" : "text-muted-foreground",
              i !== current && "hidden sm:inline",
            )}
          >
            {label}
          </span>
          {i < steps.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

/** First-run wizard: explain → master password → recovery key → create. */
export function SetupWizard({ account }: { account: string }) {
  const t = useT();
  const v = t.vault;
  const vault = useVault();
  const [step, setStep] = useState(0);
  const [pw, setPw] = useState<MasterPasswordValue>({ password: "", confirm: "" });
  const [keys, setKeys] = useState<GeneratedKeys | null>(null);
  const [saved, setSaved] = useState(false);
  const [generating, startGenerating] = useTransition();
  const [creating, startCreating] = useTransition();

  const how = [
    {
      icon: ShieldCheckIcon,
      title: v.howTitle1,
      body: v.howBody1,
      tone: "bg-primary/12 text-primary",
    },
    { icon: CloudOffIcon, title: v.howTitle2, body: v.howBody2, tone: "bg-info/12 text-info" },
    {
      icon: TriangleAlertIcon,
      title: v.howTitle3,
      body: v.howBody3,
      tone: "bg-warning/16 text-[#b76e00] dark:text-warning",
    },
  ];

  const generate = () =>
    startGenerating(async () => {
      try {
        setKeys(await createVaultKeys(pw.password));
        setSaved(false);
        setStep(2);
      } catch {
        toast.error(v.cryptoError);
      }
    });

  const create = () =>
    startCreating(async () => {
      if (!keys) return;
      const res = await setupVaultAction(keys.material);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      await vault.open(keys.sessionKey);
      toast.success(v.vaultCreated);
    });

  return (
    <Card className="mx-auto w-full max-w-2xl gap-8 p-6 sm:p-10">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <KeyRoundIcon className="size-8" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-extrabold">{v.setupTitle}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{v.setupSubtitle}</p>
      </div>
      <Stepper steps={[v.stepIntro, v.stepPassword, v.stepRecovery]} current={step} />

      {step === 0 && (
        <div className="grid gap-6">
          <ul className="grid gap-4">
            {how.map(({ icon: Icon, title, body, tone }) => (
              <li key={title} className="flex gap-4 rounded-xl border border-dashed p-4">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    tone,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="font-bold">{title}</p>
                  <p className="text-sm leading-7 text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <Button size="lg" onClick={() => setStep(1)}>
            {v.getStarted}
          </Button>
        </div>
      )}

      {step === 1 && (
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (masterPasswordReady(pw)) generate();
          }}
        >
          <MasterPasswordFields value={pw} onChange={setPw} autoFocus />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeftIcon className="rtl:rotate-180" /> {t.common.back}
            </Button>
            <Button type="submit" size="lg" disabled={!masterPasswordReady(pw) || generating}>
              {generating && <Loader2Icon className="animate-spin" />}
              {generating ? v.creatingKeys : v.continue}
            </Button>
          </div>
        </form>
      )}

      {step === 2 && keys && (
        <div className="grid gap-6">
          <h3 className="text-lg font-bold">{v.recoveryTitle}</h3>
          <RecoveryKeyPanel
            recoveryKey={keys.recoveryKey}
            account={account}
            saved={saved}
            onSavedChange={setSaved}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={creating}
              onClick={() => {
                setKeys(null);
                setStep(1);
              }}
            >
              <ArrowLeftIcon className="rtl:rotate-180" /> {t.common.back}
            </Button>
            <Button size="lg" disabled={!saved || creating} onClick={create}>
              {creating && <Loader2Icon className="animate-spin" />}
              {v.createVault}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
