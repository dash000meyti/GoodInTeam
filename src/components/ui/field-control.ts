/**
 * Pure helpers behind `<Field>` ↔ control wiring (see `field.tsx`). Kept free of React so
 * they can be unit-tested.
 */

/** What a `<Field>` tells the control rendered inside it. */
export interface FieldControlContext {
  /** id the field's `<label htmlFor>` points at. */
  controlId: string;
  /** id of the `<label>` itself (for group controls labelled via aria-labelledby). */
  labelId?: string;
  /** id of the hint / error text, when one is shown. */
  messageId?: string;
  invalid: boolean;
  /** The field shows a required marker (announced as aria-required). */
  required?: boolean;
}

export interface FieldControlProps {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  "aria-required"?: boolean | "true" | "false";
}

/** Joins space-separated id lists, dropping blanks and duplicates. */
export function joinIds(...lists: (string | null | undefined)[]): string | undefined {
  const ids = new Set(lists.flatMap((l) => (l ? l.split(/\s+/) : [])).filter(Boolean));
  return ids.size ? [...ids].join(" ") : undefined;
}

/**
 * Merges a field's ids/state into a control's props. Explicit props win (an explicit `id`
 * keeps working with `<Field htmlFor>`); described-by lists are combined.
 *
 * - `kind: "control"` (input, textarea, select trigger, date picker button): gets the
 *   field's `id` so the label is clickable and names it.
 * - `kind: "group"` (radio group, toggle group): a `<label for>` cannot name a group, so it
 *   gets `aria-labelledby` = the label instead of an id.
 */
export function mergeFieldControlProps<P extends object>(
  ctx: FieldControlContext | null | undefined,
  props: P & FieldControlProps,
  kind: "control" | "group" = "control",
): P & FieldControlProps {
  if (!ctx) return props;
  const out: P & FieldControlProps = { ...props };
  if (kind === "control") {
    out.id = props.id ?? ctx.controlId;
  } else if (!props["aria-labelledby"] && ctx.labelId) {
    out["aria-labelledby"] = ctx.labelId;
  }
  const describedBy = joinIds(props["aria-describedby"], ctx.messageId);
  if (describedBy) out["aria-describedby"] = describedBy;
  if (props["aria-invalid"] === undefined && ctx.invalid) out["aria-invalid"] = true;
  // The visual "*" is aria-hidden; announce it unless the control is natively `required`.
  if (kind === "control" && ctx.required && !props.required && props["aria-required"] === undefined)
    out["aria-required"] = true;
  return out;
}
