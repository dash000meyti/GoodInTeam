"use client";

import { useState, useTransition } from "react";
import { KeySquareIcon, Loader2Icon, LockKeyholeIcon, UnlockIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import {
  generateRecoveryKey,
  parseRecoveryKey,
  unlockWithRecoveryKey,
  VaultCryptoError,
  wrapWithPassword,
  wrapWithRecoveryKey,
} from "@/lib/vault-crypto";
import { updateVaultKeysAction } from "@/server/modules/vault/actions";
import {
  MasterPasswordFields,
  masterPasswordReady,
  type MasterPasswordValue,
} from "./master-password-fields";
import { PasswordInput } from "./password-input";
import { RecoveryKeyPanel } from "./recovery-key-panel";
import { ResetVaultDialog } from "./reset-vault-dialog";
import { Stepper } from "./setup-wizard";
import { useVault } from "./vault-provider";

type Mode = "password" | "recovery" | "newPassword" | "newRecovery";

/** Locked state: master password, or the recovery-key flow (forces a new password). */
export function UnlockScreen({ account }: { account: string }) {
  const t = useT();
  const v = t.vault;
  const vault = useVault();
  const [mode, setMode] = useState<Mode>("password");
  const [password, setPassword] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Recovery flow state (memory only).
  const [recoveredKey, setRecoveredKey] = useState<CryptoKey | null>(null);
  const [next, setNext] = useState<MasterPasswordValue>({ password: "", confirm: "" });
  const [newRecovery, setNewRecovery] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fail = (err: unknown) => {
    if (err instanceof VaultCryptoError) {
      if (err.code === "bad_secret")
        return setError(mode === "password" ? v.wrongPassword : v.wrongRecoveryKey);
      if (err.code === "invalid_recovery_key") return setError(v.invalidRecoveryKey);
      if (err.code === "no_recovery") return setError(v.noRecoveryForVault);
    }
    setError(v.cryptoError);
  };

  const submitPassword = () =>
    start(async () => {
      setError(null);
      try {
        await vault.unlock(password);
        setPassword("");
      } catch (err) {
        fail(err);
      }
    });

  const verifyRecovery = () =>
    start(async () => {
      setError(null);
      if (!vault.material) return;
      if (!parseRecoveryKey(recoveryInput)) return setError(v.invalidRecoveryKey);
      try {
        setRecoveredKey(await unlockWithRecoveryKey(vault.material, recoveryInput, true));
        setRecoveryInput("");
        setMode("newPassword");
      } catch (err) {
        fail(err);
      }
    });

  const saveRecovered = () =>
    start(async () => {
      if (!recoveredKey || !newRecovery) return;
      try {
        const master = await wrapWithPassword(recoveredKey, next.password);
        const recovery = await wrapWithRecoveryKey(recoveredKey, newRecovery);
        const res = await updateVaultKeysAction({ master, recovery });
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }
        await vault.open(recoveredKey);
        toast.success(v.recovered);
      } catch (err) {
        fail(err);
      }
    });

  const header = (icon: React.ReactNode, title: string, body: string) => (
    <div className="space-y-3 text-center">
      <div className="mx-auto flex size-16 items-center justify-center border border-frame-line bg-card bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px] text-primary-ink">
        {icon}
      </div>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mx-auto max-w-sm text-sm leading-7 text-muted-foreground">{body}</p>
    </div>
  );

  const errorBox = error && (
    <p
      role="alert"
      className="border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive"
    >
      {error}
    </p>
  );

  if (mode === "newPassword" || mode === "newRecovery") {
    return (
      <FrameBox
        as="section"
        density="compact"
        ariaLabel={v.recoveryOkTitle}
        className="mx-auto w-full max-w-2xl"
      >
        <FrameGrid cols={1}>
          <FrameCell pad="lg">
            {header(
              <KeySquareIcon className="size-8" strokeWidth={1.5} />,
              v.recoveryOkTitle,
              v.recoveryOkBody,
            )}
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell className="py-3">
            <Stepper
              steps={[v.newMasterPassword, v.recoveryKey]}
              current={mode === "newPassword" ? 0 : 1}
            />
          </FrameCell>
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell pad="lg">
            {mode === "newPassword" ? (
              <form
                className="grid gap-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!masterPasswordReady(next)) return;
                  setNewRecovery(generateRecoveryKey());
                  setSaved(false);
                  setMode("newRecovery");
                }}
              >
                <MasterPasswordFields
                  value={next}
                  onChange={setNext}
                  label={v.newMasterPassword}
                  autoFocus
                />
                <Button type="submit" size="lg" disabled={!masterPasswordReady(next)}>
                  {v.continue}
                </Button>
              </form>
            ) : (
              newRecovery && (
                <div className="grid gap-6">
                  <RecoveryKeyPanel
                    recoveryKey={newRecovery}
                    account={account}
                    saved={saved}
                    onSavedChange={setSaved}
                  />
                  {errorBox}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setMode("newPassword")}
                    >
                      {t.common.back}
                    </Button>
                    <Button size="lg" disabled={!saved || pending} onClick={saveRecovered}>
                      {pending && <Loader2Icon className="animate-spin" />}
                      {v.saveAndUnlock}
                    </Button>
                  </div>
                </div>
              )
            )}
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    );
  }

  return (
    <FrameBox
      as="section"
      density="compact"
      ariaLabel={v.title}
      className="mx-auto w-full max-w-md"
    >
      <FrameGrid cols={1}>
        <FrameCell pad="lg" className="grid gap-7">
          {mode === "password"
            ? header(
                <LockKeyholeIcon className="size-8" strokeWidth={1.5} />,
                v.lockedTitle,
                v.lockedBody,
              )
            : header(
                <KeySquareIcon className="size-8" strokeWidth={1.5} />,
                v.useRecoveryKey,
                v.forgotPassword,
              )}

          {mode === "password" ? (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (password) submitPassword();
              }}
            >
              <Field label={v.masterPassword} htmlFor="vault-master">
                <PasswordInput
                  id="vault-master"
                  name="vault-master"
                  value={password}
                  onChange={(p) => {
                    setPassword(p);
                    setError(null);
                  }}
                  autoComplete="off"
                  autoFocus
                  invalid={!!error}
                  data-1p-ignore
                  data-lpignore="true"
                />
              </Field>
              {errorBox}
              <Button type="submit" size="lg" disabled={!password || pending}>
                {pending ? <Loader2Icon className="animate-spin" /> : <UnlockIcon />}
                {pending ? v.unlocking : v.unlock}
              </Button>
              <Button
                type="button"
                variant="link"
                className="h-auto justify-self-center p-0 text-sm"
                onClick={() => {
                  setMode("recovery");
                  setError(null);
                }}
              >
                {v.forgotPassword} {v.useRecoveryKey}
              </Button>
            </form>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (recoveryInput.trim()) verifyRecovery();
              }}
            >
              <Field label={v.recoveryKey} htmlFor="vault-recovery">
                <Input
                  id="vault-recovery"
                  dir="ltr"
                  value={recoveryInput}
                  onChange={(e) => {
                    setRecoveryInput(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="XXXX-XXXX-XXXX-…"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="characters"
                  autoFocus
                  aria-invalid={!!error || undefined}
                  className="font-mono tracking-wider"
                />
              </Field>
              {errorBox}
              <Button type="submit" size="lg" disabled={!recoveryInput.trim() || pending}>
                {pending && <Loader2Icon className="animate-spin" />}
                {pending ? v.verifying : v.verifyKey}
              </Button>
              <Button
                type="button"
                variant="link"
                className="h-auto justify-self-center p-0 text-sm"
                onClick={() => {
                  setMode("password");
                  setError(null);
                }}
              >
                {v.backToPassword}
              </Button>
            </form>
          )}
        </FrameCell>
      </FrameGrid>
      <FrameGrid cols={1}>
        <FrameCell className="py-3 text-center">
          <ResetVaultDialog
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                {v.resetVault}
              </Button>
            }
          />
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}
