"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, RefreshCwIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useVaultCopy } from "./clipboard";
import {
  CHARSETS,
  DEFAULT_PASSPHRASE_OPTIONS,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassphrase,
  generatePassword,
  PASSPHRASE_WORDS,
  PASSWORD_LENGTH,
  type PassphraseOptions,
  type PasswordOptions,
} from "./generator";
import { StrengthMeter } from "./strength-meter";

type Mode = "password" | "passphrase";
const SEPARATORS = ["-", ".", "_", " "] as const;

function make(mode: Mode, pw: PasswordOptions, pp: PassphraseOptions) {
  return mode === "password" ? generatePassword(pw) : generatePassphrase(pp);
}

/** Digits and symbols coloured differently, like good password managers do. */
function Colored({ value }: { value: string }) {
  return (
    <>
      {[...value].map((c, i) => (
        <span
          key={i}
          className={cn(
            CHARSETS.digits.includes(c) && "text-info",
            CHARSETS.symbols.includes(c) && "text-[#b76e00] dark:text-warning",
          )}
        >
          {c}
        </span>
      ))}
    </>
  );
}

/**
 * Password / passphrase generator. Stand-alone (Generator tab) or compact in a
 * popover next to a password field (`onUse`).
 */
export function PasswordGenerator({
  onUse,
  compact = false,
}: {
  onUse?: (value: string) => void;
  compact?: boolean;
}) {
  const t = useT();
  const v = t.vault;
  const locale = useLocale();
  const copy = useVaultCopy();
  const [mode, setMode] = useState<Mode>("password");
  const [pw, setPw] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [pp, setPp] = useState<PassphraseOptions>(DEFAULT_PASSPHRASE_OPTIONS);
  const [value, setValue] = useState(() => make("password", DEFAULT_PASSWORD_OPTIONS, pp));

  const update = (next: { mode?: Mode; pw?: PasswordOptions; pp?: PassphraseOptions }) => {
    const m = next.mode ?? mode;
    const a = next.pw ?? pw;
    const b = next.pp ?? pp;
    if (next.mode) setMode(m);
    if (next.pw) setPw(a);
    if (next.pp) setPp(b);
    setValue(make(m, a, b));
  };

  const toggles: { key: keyof Omit<PasswordOptions, "length">; label: string }[] = [
    { key: "upper", label: v.uppercase },
    { key: "lower", label: v.lowercase },
    { key: "digits", label: v.digits },
    { key: "symbols", label: v.symbols },
    { key: "excludeAmbiguous", label: v.excludeAmbiguous },
  ];

  return (
    <div className={cn("grid gap-5", compact && "gap-4")}>
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(m) => m && update({ mode: m as Mode })}
        className="w-full"
      >
        <ToggleGroupItem value="password" className="flex-1">
          {v.modePassword}
        </ToggleGroupItem>
        <ToggleGroupItem value="passphrase" className="flex-1">
          {v.modePassphrase}
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="rounded-xl border border-dashed bg-muted/40 p-3">
        <p
          dir="ltr"
          className={cn(
            "font-mono break-all select-all",
            compact ? "min-h-12 text-sm leading-6" : "min-h-16 text-lg leading-8",
          )}
          data-testid="generated-password"
        >
          <Colored value={value} />
        </p>
        <div className="mt-3 flex items-center gap-2">
          <StrengthMeter password={value} showWarning={false} className="flex-1" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => update({})}>
          <RefreshCwIcon /> {v.regenerate}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => copy.secret(value)}>
          <CopyIcon /> {t.common.copy}
        </Button>
        {onUse && (
          <Button type="button" size="sm" className="ms-auto" onClick={() => onUse(value)}>
            <CheckIcon /> {v.useGenerated}
          </Button>
        )}
      </div>

      {mode === "password" ? (
        <div className="grid gap-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm">
              <Label>{v.length}</Label>
              <span className="font-bold tabular-nums">{formatNumber(pw.length, locale)}</span>
            </div>
            <Slider
              min={PASSWORD_LENGTH.min}
              max={PASSWORD_LENGTH.max}
              step={1}
              value={[pw.length]}
              onValueChange={([n]) => update({ pw: { ...pw, length: n ?? pw.length } })}
              aria-label={v.length}
            />
          </div>
          <div className={cn("grid gap-2.5", !compact && "sm:grid-cols-2")}>
            {toggles.map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-3 text-sm"
              >
                <span>{label}</span>
                <Switch
                  checked={pw[key]}
                  onCheckedChange={(c) => update({ pw: { ...pw, [key]: c } })}
                />
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm">
              <Label>{v.words}</Label>
              <span className="font-bold tabular-nums">{formatNumber(pp.words, locale)}</span>
            </div>
            <Slider
              min={PASSPHRASE_WORDS.min}
              max={PASSPHRASE_WORDS.max}
              step={1}
              value={[pp.words]}
              onValueChange={([n]) => update({ pp: { ...pp, words: n ?? pp.words } })}
              aria-label={v.words}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>{v.separator}</span>
            <ToggleGroup
              type="single"
              value={pp.separator}
              onValueChange={(s) => s && update({ pp: { ...pp, separator: s } })}
              dir="ltr"
            >
              {SEPARATORS.map((s) => (
                <ToggleGroupItem
                  key={s}
                  value={s}
                  className="font-mono"
                  aria-label={s === " " ? v.separator_space : s}
                >
                  {s === " " ? "␣" : s}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className={cn("grid gap-2.5", !compact && "sm:grid-cols-2")}>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>{v.capitalize}</span>
              <Switch
                checked={pp.capitalize}
                onCheckedChange={(c) => update({ pp: { ...pp, capitalize: c } })}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>{v.includeNumber}</span>
              <Switch
                checked={pp.includeNumber}
                onCheckedChange={(c) => update({ pp: { ...pp, includeNumber: c } })}
              />
            </label>
          </div>
        </div>
      )}
      {!compact && <p className="text-xs text-muted-foreground">{v.generatorHint}</p>}
    </div>
  );
}

/** Wand button that opens the generator in a popover and fills a field. */
export function GeneratorPopover({ onUse }: { onUse: (value: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label={t.vault.generator}
        >
          <WandSparklesIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="max-h-[var(--radix-popover-content-available-height)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto"
      >
        <PasswordGenerator
          compact
          onUse={(val) => {
            onUse(val);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
