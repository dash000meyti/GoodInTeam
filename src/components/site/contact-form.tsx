"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, Loader2Icon, SendIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitContactAction } from "@/server/modules/leads/actions";

export interface ContactFormLabels {
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  servicePlaceholder: string;
  serviceOther: string;
  budget: string;
  message: string;
  messagePlaceholder: string;
  send: string;
  sending: string;
  privacy: string;
  successTitle: string;
  successBody: string;
  sendAnother: string;
  optional: string;
}

const field =
  "h-12 w-full rounded-xl border border-input bg-background px-4 text-[15px] transition-colors outline-none placeholder:text-muted-foreground/70 hover:border-foreground/30 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 aria-invalid:border-destructive";

/**
 * Public contact form → submitContactAction (leads). No UI library: native
 * inputs/selects keep the bundle tiny. Includes an off-screen honeypot.
 */
export function ContactForm({
  labels: l,
  services,
  budgets,
  defaultService,
  source,
}: {
  labels: ContactFormLabels;
  services: { value: string; label: string }[];
  budgets: { value: string; label: string }[];
  defaultService?: string;
  source?: string;
}) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-3xl border border-success/30 bg-success/5 px-6 py-16 text-center"
        role="status"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2Icon className="size-8" />
        </span>
        <h2 className="text-2xl font-black">{l.successTitle}</h2>
        <p className="max-w-sm leading-7 text-muted-foreground">{l.successBody}</p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-2 inline-flex h-10 cursor-pointer items-center rounded-full border border-border px-5 text-sm font-bold hover:border-foreground/30"
        >
          {l.sendAnother}
        </button>
      </div>
    );
  }

  const err = (name: string) => errors[name]?.[0];
  const label = (name: string, text: string, optional?: boolean) => (
    <label htmlFor={`cf-${name}`} className="mb-2 flex items-center gap-1 text-sm font-semibold">
      {text}
      {optional ? (
        <span className="text-xs font-normal text-muted-foreground">({l.optional})</span>
      ) : (
        <span className="text-destructive">*</span>
      )}
    </label>
  );
  const fieldError = (name: string) =>
    err(name) ? (
      <p id={`cf-${name}-err`} className="mt-1.5 text-xs font-medium text-destructive" role="alert">
        {err(name)}
      </p>
    ) : null;
  const a11y = (name: string) => ({
    id: `cf-${name}`,
    name,
    "aria-invalid": err(name) ? true : undefined,
    "aria-describedby": err(name) ? `cf-${name}-err` : undefined,
  });

  return (
    <form
      noValidate
      action={(fd) =>
        start(async () => {
          setMessage(null);
          const res = await submitContactAction(fd);
          if (res.ok) {
            setErrors({});
            setDone(true);
          } else {
            setErrors(res.error.fieldErrors ?? {});
            setMessage(res.error.message);
          }
        })
      }
      className="grid gap-5 sm:grid-cols-2"
    >
      {source && <input type="hidden" name="source" value={source} />}
      {/* honeypot: hidden from people, tempting for bots */}
      <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        {label("name", l.name)}
        <input {...a11y("name")} required autoComplete="name" className={field} />
        {fieldError("name")}
      </div>
      <div>
        {label("email", l.email)}
        <input
          {...a11y("email")}
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          className={cn(field, "text-start")}
        />
        {fieldError("email")}
      </div>
      <div>
        {label("phone", l.phone, true)}
        <input
          {...a11y("phone")}
          type="tel"
          autoComplete="tel"
          dir="ltr"
          className={cn(field, "text-start")}
        />
        {fieldError("phone")}
      </div>
      <div>
        {label("company", l.company, true)}
        <input {...a11y("company")} autoComplete="organization" className={field} />
        {fieldError("company")}
      </div>
      <div>
        {label("service", l.service, true)}
        <select
          {...a11y("service")}
          defaultValue={defaultService ?? ""}
          className={cn(
            field,
            "cursor-pointer appearance-none bg-[length:16px] bg-[position:left_1rem_center] bg-no-repeat ltr:bg-[position:right_1rem_center]",
          )}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23919EAB' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          }}
        >
          <option value="">{l.servicePlaceholder}</option>
          {services.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
          <option value="other">{l.serviceOther}</option>
        </select>
      </div>
      <div>
        {label("budget", l.budget, true)}
        <select
          {...a11y("budget")}
          defaultValue=""
          className={cn(
            field,
            "cursor-pointer appearance-none bg-[length:16px] bg-[position:left_1rem_center] bg-no-repeat ltr:bg-[position:right_1rem_center]",
          )}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23919EAB' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          }}
        >
          <option value="">{l.servicePlaceholder}</option>
          {budgets.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        {label("message", l.message)}
        <textarea
          {...a11y("message")}
          required
          rows={6}
          placeholder={l.messagePlaceholder}
          className={cn(field, "h-auto min-h-36 resize-y py-3 leading-7")}
        />
        {fieldError("message")}
      </div>
      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-muted-foreground">{l.privacy}</p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] font-bold text-primary-foreground shadow-primary transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {pending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SendIcon className="size-4 rtl:-scale-x-100" />
          )}
          {pending ? l.sending : l.send}
        </button>
      </div>
      {message && !Object.keys(errors).length && (
        <p className="text-sm font-medium text-destructive sm:col-span-2" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
