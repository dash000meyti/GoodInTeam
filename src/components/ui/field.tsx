"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  mergeFieldControlProps,
  type FieldControlContext,
  type FieldControlProps,
} from "@/components/ui/field-control";

/*
 * NOTE: one Field labels ONE control. Two id-taking controls in the same Field would share
 * the id — split them into two Fields (or give the second its own aria-label).
 */

interface FieldContextValue extends FieldControlContext {
  /** A group control tells the field its label must not point at an id (`for`). */
  registerGroup: () => () => void;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

/**
 * Wires a control to the `<Field>` around it: `id` (so the label is clickable and names
 * the control), `aria-describedby` (hint/error) and `aria-invalid`. Explicit props win.
 * Used by `Input`, `Textarea`, `SelectTrigger` (→ `SelectField`) and `DatePicker`;
 * use it in any custom single-value control. Groups (radio/toggle groups, swatches) pass
 * `"group"` and get `aria-labelledby` instead of the id.
 */
function useFieldControl<P extends object>(
  props: P & FieldControlProps,
  kind: "control" | "group" = "control",
): P & FieldControlProps {
  const ctx = React.use(FieldContext);
  const register = kind === "group" ? ctx?.registerGroup : undefined;
  React.useLayoutEffect(() => register?.(), [register]);
  return mergeFieldControlProps(ctx, props, kind);
}

/**
 * Stops field wiring from leaking into nested UI (e.g. a search input inside a popover
 * opened from a field's control). Popover content uses it automatically.
 */
function FieldContextReset({ children }: { children: React.ReactNode }) {
  return <FieldContext value={null}>{children}</FieldContext>;
}

/**
 * Form field wrapper: label + control + hint/error, wired for assistive tech.
 *
 *   <Field label="Title" error={errors?.title?.[0]}><Input name="title" /></Field>
 *
 * The label gets an auto id (`useId`) and points at the control; the control picks the id
 * up from context (see `useFieldControl`). `htmlFor` stays supported: when set, it is the
 * id used. `group` is for custom groups of buttons/checkboxes that are not a single
 * control: the wrapper becomes `role="group"` labelled by the label.
 */
function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
  required,
  group,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
  required?: boolean;
  group?: boolean;
}) {
  const autoId = React.useId();
  const controlId = htmlFor ?? `${autoId}control`;
  const labelId = label ? `${autoId}label` : undefined;
  const messageId = error || hint ? `${autoId}message` : undefined;
  const invalid = !!error;
  // Group controls inside (RadioGroup, ToggleGroup…) register themselves: a <label for>
  // cannot name a group, so the label then drops `for` (the group uses aria-labelledby).
  const [groupControls, setGroupControls] = React.useState(0);
  const registerGroup = React.useCallback(() => {
    setGroupControls((n) => n + 1);
    return () => setGroupControls((n) => n - 1);
  }, []);

  const ctx = React.useMemo<FieldContextValue>(
    () => ({ controlId, labelId, messageId, invalid, required, registerGroup }),
    [controlId, labelId, messageId, invalid, required, registerGroup],
  );
  const labelFor = group || groupControls > 0 ? undefined : controlId;

  return (
    <FieldContext value={group ? null : ctx}>
      <div
        data-slot="field"
        data-invalid={invalid || undefined}
        role={group ? "group" : undefined}
        aria-labelledby={group ? labelId : undefined}
        aria-describedby={group ? messageId : undefined}
        // min-w-0: as a grid/flex item, long unbreakable values (URLs, slugs) must not widen the page.
        className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2", className)}
      >
        {label && (
          <Label id={labelId} htmlFor={labelFor}>
            {label}
            {required && (
              <span aria-hidden className="text-destructive">
                *
              </span>
            )}
          </Label>
        )}
        {children}
        {error ? (
          <p id={messageId} className="text-xs font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={messageId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext>
  );
}

export { Field, FieldContextReset, useFieldControl };
