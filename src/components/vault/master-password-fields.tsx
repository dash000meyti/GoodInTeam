"use client";

import { useId, useMemo, useState } from "react";
import { CheckCircle2Icon, CircleIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { generatePassphrase } from "./generator";
import { PasswordInput } from "./password-input";
import { StrengthMeter } from "./strength-meter";
import { checkMasterPassword } from "./strength";

export interface MasterPasswordValue {
  password: string;
  confirm: string;
}

/** True when the pair is acceptable as a master password. */
export function masterPasswordReady(v: MasterPasswordValue) {
  return checkMasterPassword(v.password).ok && v.password === v.confirm;
}

/**
 * "Choose a master password" block: password + confirmation, strength meter,
 * rule checklist and a passphrase suggestion. Controlled.
 */
export function MasterPasswordFields({
  value,
  onChange,
  label,
  autoFocus,
}: {
  value: MasterPasswordValue;
  onChange: (v: MasterPasswordValue) => void;
  label?: string;
  autoFocus?: boolean;
}) {
  const t = useT();
  const v = t.vault;
  const id = useId();
  const [suggested, setSuggested] = useState<string | null>(null);
  const check = useMemo(() => checkMasterPassword(value.password), [value.password]);
  const mismatch = value.confirm.length > 0 && value.confirm !== value.password;
  const rules = [
    { ok: check.length, label: v.ruleLength },
    { ok: check.variety, label: v.ruleVariety },
    { ok: check.unpredictable && check.strength.score >= 2, label: v.ruleUnpredictable },
  ];

  return (
    <div className="grid gap-5">
      <Field label={label ?? v.masterPassword} htmlFor={`${id}-pw`} hint={v.masterPasswordHint}>
        <PasswordInput
          id={`${id}-pw`}
          value={value.password}
          onChange={(password) => onChange({ ...value, password })}
          autoComplete="new-password"
          autoFocus={autoFocus}
          name="vault-new-master"
        />
      </Field>
      <div className="-mt-2 grid gap-3">
        <StrengthMeter password={value.password} strength={check.strength} />
        <ul className="grid gap-1.5 text-sm">
          {rules.map((r) => (
            <li
              key={r.label}
              className={cn(
                "flex items-center gap-2",
                r.ok ? "text-[#118d57] dark:text-success" : "text-muted-foreground",
              )}
            >
              {r.ok ? (
                <CheckCircle2Icon className="size-4 shrink-0" />
              ) : (
                <CircleIcon className="size-4 shrink-0" />
              )}
              {r.label}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="soft"
          size="sm"
          className="w-fit"
          onClick={() => {
            const p = generatePassphrase({
              words: 6,
              separator: "-",
              capitalize: true,
              includeNumber: true,
            });
            setSuggested(p);
            onChange({ password: p, confirm: "" });
          }}
        >
          <SparklesIcon /> {v.suggestPassphrase}
        </Button>
        {suggested && suggested === value.password && (
          <p
            dir="ltr"
            className="rounded-lg border border-dashed border-primary/40 bg-primary/8 px-3 py-2 text-center font-mono text-sm font-semibold break-all text-primary-dark select-all dark:text-primary-light"
            data-testid="suggested-passphrase"
          >
            {suggested}
          </p>
        )}
      </div>
      <Field
        label={v.confirmPassword}
        htmlFor={`${id}-confirm`}
        error={mismatch ? v.passwordsDontMatch : null}
      >
        <PasswordInput
          id={`${id}-confirm`}
          value={value.confirm}
          onChange={(confirm) => onChange({ ...value, confirm })}
          autoComplete="new-password"
          name="vault-new-master-confirm"
          invalid={mismatch}
        />
      </Field>
    </div>
  );
}
