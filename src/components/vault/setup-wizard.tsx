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
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
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
  const locale = useLocale();
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => (
        <li
          key={label}
          className={cn(
            "flex min-w-0 items-center gap-2 sm:flex-1",
            i === current ? "flex-[3]" : "flex-1",
          )}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center border text-xs font-bold transition-colors",
              i < current && "border-[var(--primary-dark)] bg-primary text-primary-foreground",
              i === current && "border-foreground bg-foreground text-background",
              i > current && "border-frame-line bg-card text-muted-foreground",
            )}
            aria-current={i === current ? "step" : undefined}
          >
            {formatNumber(i + 1, locale)}
          </span>
          <span
            className={cn(
              "truncate text-xs font-semibold sm:text-sm",
              i === current ? "text-foreground" : "hidden text-muted-foreground sm:inline",
            )}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <span className="h-px min-w-3 flex-1 bg-frame-line" aria-hidden />
          )}
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
      tone: "text-primary-ink",
    },
    { icon: CloudOffIcon, title: v.howTitle2, body: v.howBody2, tone: "text-info-ink" },
    {
      icon: TriangleAlertIcon,
      title: v.howTitle3,
      body: v.howBody3,
      tone: "text-warning-ink",
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
    // One framed box: the heading row, the stepper row, then the step's rows.
    <FrameBox
      as="section"
      density="compact"
      ariaLabel={v.setupTitle}
      className="mx-auto w-full max-w-2xl"
    >
      <FrameGrid cols={1}>
        <FrameCell pad="lg" className="space-y-3 text-center">
          <div className="mx-auto flex size-16 items-center justify-center border border-frame-line bg-card bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px] text-primary-ink">
            <KeyRoundIcon className="size-8" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-extrabold">{v.setupTitle}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{v.setupSubtitle}</p>
        </FrameCell>
      </FrameGrid>
      <FrameGrid cols={1}>
        <FrameCell className="py-3">
          <Stepper steps={[v.stepIntro, v.stepPassword, v.stepRecovery]} current={step} />
        </FrameCell>
      </FrameGrid>

      {step === 0 && (
        <>
          <FrameGrid cols={1} as="ul">
            {how.map(({ icon: Icon, title, body, tone }) => (
              <FrameCell key={title} as="li" className="flex gap-4">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center border border-frame-line bg-card",
                    tone,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="font-bold">{title}</p>
                  <p className="text-sm leading-7 text-muted-foreground">{body}</p>
                </div>
              </FrameCell>
            ))}
          </FrameGrid>
          <FrameGrid cols={1}>
            <FrameCell className="grid">
              <Button size="lg" onClick={() => setStep(1)}>
                {v.getStarted}
              </Button>
            </FrameCell>
          </FrameGrid>
        </>
      )}

      {step === 1 && (
        <FrameGrid cols={1}>
          <FrameCell pad="lg">
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
          </FrameCell>
        </FrameGrid>
      )}

      {step === 2 && keys && (
        <FrameGrid cols={1}>
          <FrameCell pad="lg" className="grid gap-6">
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
          </FrameCell>
        </FrameGrid>
      )}
    </FrameBox>
  );
}
