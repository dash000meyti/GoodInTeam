import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Form field wrapper: label + control + hint/error.
 * <Field label="Title" htmlFor="title" error={errors?.title?.[0]}><Input id="title" /></Field>
 */
function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
  required,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div data-slot="field" className={cn("grid gap-2", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export { Field };
