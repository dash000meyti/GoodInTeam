"use client";

import { useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { setupOwner } from "@/server/modules/auth/actions";

export function SetupForm() {
  const t = useT();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="grid gap-5"
      action={(fd) =>
        start(async () => {
          const res = await setupOwner(fd);
          if (res && !res.ok) {
            setMessage(res.error.message);
            setErrors(res.error.fieldErrors ?? {});
          }
        })
      }
    >
      <Field label={t.auth.name} htmlFor="name" error={errors.name?.[0]}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label={t.auth.email} htmlFor="email" error={errors.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required />
      </Field>
      <Field
        label={t.auth.password}
        htmlFor="password"
        hint={t.auth.passwordHint}
        error={errors.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          minLength={10}
          required
        />
      </Field>
      {message && !Object.keys(errors).length && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {t.auth.setupSubmit}
      </Button>
    </form>
  );
}
