"use client";

import { startTransition, useRef, useState, useTransition, type FormEvent } from "react";
import { requestFormReset } from "react-dom";
import { toast } from "sonner";
import type { ActionResult } from "@/server/action";

/**
 * Standard client-side wiring for a server action form:
 *
 *   const form = useActionForm(createProject, { onSuccess: () => setOpen(false), successMessage: t.common.saved });
 *   <form onSubmit={form.submit}> … <Field error={form.errors.name?.[0]}> … </form>
 *
 * `submit` is an `onSubmit` handler (not a form `action`): React resets a form after an
 * `action` runs, which would wipe what the user typed when the server returns a validation
 * error. Here the form keeps its values on error and is reset only after a success.
 */
export function useActionForm<O>(
  // Every defineAction() action accepts FormData (and a typed object).
  action: (input: FormData) => Promise<ActionResult<O>>,
  opts: { onSuccess?: (data: O) => void; successMessage?: string } = {},
) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  // Guards against double submits (Enter pressed while the request is in flight).
  const inFlight = useRef(false);

  const exec = (input: FormData | Record<string, unknown>, form?: HTMLFormElement) =>
    new Promise<ActionResult<O> | undefined>((resolve) =>
      start(async () => {
        inFlight.current = true;
        setMessage(null);
        try {
          const res = await (action as (i: unknown) => Promise<ActionResult<O>>)(input);
          if (!res) return resolve(undefined); // redirected
          if (res.ok) {
            setErrors({});
            if (opts.successMessage) toast.success(opts.successMessage);
            // Same behaviour as a successful <form action>: back to the (fresh) defaults.
            if (form) startTransition(() => requestFormReset(form));
            opts.onSuccess?.(res.data);
          } else {
            setErrors(res.error.fieldErrors ?? {});
            setMessage(res.error.message);
            if (!res.error.fieldErrors) toast.error(res.error.message);
          }
          resolve(res);
        } finally {
          inFlight.current = false;
        }
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
    /** Pass to `<form onSubmit={...}>` (also works for `<button form="id">` submitters). */
    submit: (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (inFlight.current) return;
      const form = e.currentTarget;
      const submitter = (e.nativeEvent as SubmitEvent).submitter;
      void exec(new FormData(form, submitter ?? undefined), form);
    },
    /** Call with FormData or a plain object */
    run: (input: FormData | Record<string, unknown>) => exec(input),
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
