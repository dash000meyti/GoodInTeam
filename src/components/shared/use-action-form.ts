"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/server/action";

/**
 * Standard client-side wiring for a server action form:
 *
 *   const form = useActionForm(createProject, { onSuccess: () => setOpen(false), successMessage: t.common.saved });
 *   <form action={form.submit}> … <Field error={form.errors.name?.[0]}> … </form>
 */
export function useActionForm<O>(
  // Every defineAction() action accepts FormData (and a typed object).
  action: (input: FormData) => Promise<ActionResult<O>>,
  opts: { onSuccess?: (data: O) => void; successMessage?: string } = {},
) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);

  const run = (input: FormData | Record<string, unknown>) =>
    new Promise<ActionResult<O> | undefined>((resolve) =>
      start(async () => {
        setMessage(null);
        const res = await (action as (i: unknown) => Promise<ActionResult<O>>)(input);
        if (!res) return resolve(undefined); // redirected
        if (res.ok) {
          setErrors({});
          if (opts.successMessage) toast.success(opts.successMessage);
          opts.onSuccess?.(res.data);
        } else {
          setErrors(res.error.fieldErrors ?? {});
          setMessage(res.error.message);
          if (!res.error.fieldErrors) toast.error(res.error.message);
        }
        resolve(res);
      }),
    );

  return {
    pending,
    errors,
    message,
    reset: () => {
      setErrors({});
      setMessage(null);
    },
    /** Pass to <form action={...}> */
    submit: (fd: FormData) => void run(fd),
    /** Call with a plain object */
    run,
  };
}

/** Fire-and-forget action with toasts (buttons like "delete", "toggle"). */
export function useAction() {
  const [pending, start] = useTransition();
  const exec = <O>(p: Promise<ActionResult<O>>, success?: string) =>
    start(async () => {
      const res = await p;
      if (!res) return;
      if (res.ok) {
        if (success) toast.success(success);
      } else toast.error(res.error.message);
    });
  return { pending, exec };
}
