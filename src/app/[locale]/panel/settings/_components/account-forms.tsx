"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRoundIcon, Loader2Icon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SwitchInput } from "@/components/shared/switch-input";
import { useActionForm } from "@/components/shared/use-action-form";
import { localePath, localeMeta, locales } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { cn, initials } from "@/lib/utils";
import { changePasswordAction } from "@/server/modules/auth/actions";
import { updateAccountAction } from "@/server/modules/users/actions";
import { PasswordInput } from "./password-input";
import { passwordStrength } from "./password-strength";
import { SettingsCard } from "./section";

export interface AccountValues {
  name: string;
  email: string;
  title: string | null;
  avatarUrl: string | null;
  locale: "fa" | "en";
}

/** Settings → My account: personal info with a live avatar preview. */
export function AccountForm({
  user,
  roleLabel,
  memberSince,
  portal,
}: {
  user: AccountValues;
  roleLabel: string;
  memberSince: string;
  portal?: string | null;
}) {
  const t = useT();
  const s = t.settings;
  const router = useRouter();
  const [avatar, setAvatar] = useState(user.avatarUrl ?? "");
  const [name, setName] = useState(user.name);
  const form = useActionForm(updateAccountAction, {
    successMessage: t.common.saved,
    onSuccess: (d) => {
      if (d.localeChanged) router.push(localePath(d.locale, "/panel/settings"));
    },
  });

  return (
    <form action={form.submit}>
      <SettingsCard
        icon={UserRoundIcon}
        title={s.personalInfo}
        footer={
          <Button type="submit" disabled={form.pending}>
            {form.pending && <Loader2Icon className="animate-spin" />}
            {t.common.save}
          </Button>
        }
      >
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-muted/50 p-4">
          <Avatar className="size-16 ring-4 ring-background">
            {avatar && <AvatarImage src={avatar} alt={name} className="object-cover" />}
            <AvatarFallback className="text-lg">{initials(name || "?")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-lg font-bold">{name || "—"}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge>{roleLabel}</Badge>
              {portal && <Badge variant="info">{portal}</Badge>}
              <span>{memberSince}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.common.name} error={form.errors.name?.[0]} required htmlFor="acc-name">
            <Input
              id="acc-name"
              name="name"
              dir="auto"
              defaultValue={user.name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </Field>
          <Field label={t.common.email} error={form.errors.email?.[0]} required htmlFor="acc-email">
            <Input
              id="acc-email"
              name="email"
              type="email"
              dir="ltr"
              defaultValue={user.email}
              autoComplete="email"
              required
            />
          </Field>
          <Field label={s.jobTitle} error={form.errors.title?.[0]} htmlFor="acc-title">
            <Input
              id="acc-title"
              name="title"
              dir="auto"
              defaultValue={user.title ?? ""}
              placeholder={s.jobTitlePlaceholder}
            />
          </Field>
          <Field
            label={s.avatarUrl}
            hint={s.avatarUrlHint}
            error={form.errors.avatarUrl?.[0]}
            htmlFor="acc-avatar"
          >
            <Input
              id="acc-avatar"
              name="avatarUrl"
              dir="ltr"
              inputMode="url"
              defaultValue={user.avatarUrl ?? ""}
              onChange={(e) => setAvatar(e.target.value.trim())}
              placeholder="https://…"
            />
          </Field>
          <Field label={s.preferredLocale} hint={s.preferredLocaleHint} className="sm:col-span-2">
            <RadioGroup
              name="locale"
              defaultValue={user.locale}
              className="grid grid-cols-2 gap-3 sm:max-w-md"
            >
              {locales.map((l) => (
                <Label
                  key={l}
                  htmlFor={`acc-locale-${l}`}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 font-semibold transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/6"
                >
                  <RadioGroupItem id={`acc-locale-${l}`} value={l} />
                  <span lang={l} dir={localeMeta[l].dir}>
                    {localeMeta[l].label}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </Field>
        </div>
      </SettingsCard>
    </form>
  );
}

const strengthTone = [
  "bg-grey-500/30",
  "bg-destructive",
  "bg-warning",
  "bg-info",
  "bg-success",
] as const;

/** Settings → My account: change password (+ optionally sign out other devices). */
export function PasswordForm({ email }: { email: string }) {
  const t = useT();
  const s = t.settings;
  const ref = useRef<HTMLFormElement>(null);
  const [pw, setPw] = useState("");
  const score = passwordStrength(pw);
  const form = useActionForm(changePasswordAction, {
    onSuccess: (d) => {
      toast.success(
        d.revokedSessions > 0
          ? format(s.passwordChangedRevoked, { n: d.revokedSessions })
          : s.passwordChanged,
      );
      ref.current?.reset();
      setPw("");
    },
  });

  return (
    <form ref={ref} action={form.submit}>
      <SettingsCard
        icon={KeyRoundIcon}
        title={s.passwordTitle}
        description={s.passwordHint}
        footer={
          <Button type="submit" disabled={form.pending}>
            {form.pending && <Loader2Icon className="animate-spin" />}
            {s.changePassword}
          </Button>
        }
      >
        {/* Lets password managers attach the change to the right account. */}
        <input type="email" name="username" value={email} autoComplete="username" hidden readOnly />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={s.currentPassword}
            error={form.errors.currentPassword?.[0]}
            className="sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]"
            htmlFor="pw-current"
          >
            <PasswordInput
              id="pw-current"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label={s.newPassword} error={form.errors.newPassword?.[0]} htmlFor="pw-new">
            <PasswordInput
              id="pw-new"
              name="newPassword"
              autoComplete="new-password"
              minLength={10}
              required
              onChange={(e) => setPw(e.target.value)}
            />
            <div className="flex items-center gap-3" aria-live="polite">
              <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-colors",
                      score >= i ? strengthTone[score] : "bg-grey-500/20",
                    )}
                  />
                ))}
              </div>
              <span className="w-20 text-end text-xs font-semibold text-muted-foreground">
                {pw ? s[`strength_${score}`] : s.strength}
              </span>
            </div>
          </Field>
          <Field
            label={s.confirmPassword}
            error={form.errors.confirmPassword?.[0]}
            htmlFor="pw-confirm"
          >
            <PasswordInput
              id="pw-confirm"
              name="confirmPassword"
              autoComplete="new-password"
              required
            />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed p-4 sm:col-span-2">
            <SwitchInput name="revokeOtherSessions" defaultChecked />
            <span className="space-y-0.5">
              <span className="block text-sm font-semibold">{s.revokeOthers}</span>
              <span className="block text-xs text-muted-foreground">{s.revokeOthersHint}</span>
            </span>
          </label>
        </div>
      </SettingsCard>
    </form>
  );
}
