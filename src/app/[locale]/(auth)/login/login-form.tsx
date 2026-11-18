"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/password-input";
import { useT } from "@/i18n/client";
import { login } from "@/server/modules/auth/actions";

export function LoginForm() {
  const t = useT();
  const next = useSearchParams().get("next") ?? undefined;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-5"
      // onSubmit (not action=): React resets forms after an action, which would clear the email.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const res = await login({
            email: String(fd.get("email") ?? ""),
            password: String(fd.get("password") ?? ""),
            next,
          });
          if (res && !res.ok) setError(res.error.message);
        });
      }}
    >
      <Field label={t.auth.email} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          dir="ltr"
          required
          autoFocus
        />
      </Field>
      <Field label={t.auth.password} htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}
      <Button type="submit" size="lg" variant="inherit" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {t.auth.submit}
      </Button>
    </form>
  );
}
