"use client";

import { useState, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

export interface SelectOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

/**
 * Select that works inside a plain <form> (writes a hidden input) and supports
 * an explicit "none" option (submitted as "").
 */
export function SelectField({
  name,
  options,
  defaultValue,
  value: controlled,
  onChange,
  placeholder,
  noneLabel,
  id,
  className,
  size,
}: {
  name?: string;
  options: SelectOption[];
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** When set, adds a "none" option that submits "". */
  noneLabel?: string;
  id?: string;
  className?: string;
  size?: "sm" | "default";
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const value = controlled !== undefined ? (controlled ?? "") : inner;
  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <Select
        value={value === "" ? (noneLabel ? NONE : undefined) : value}
        onValueChange={(v) => {
          const next = v === NONE ? "" : v;
          if (controlled === undefined) setInner(next);
          onChange?.(next);
        }}
      >
        <SelectTrigger id={id} className={className} size={size}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {noneLabel && (
            <SelectItem value={NONE}>
              <span className="text-muted-foreground">{noneLabel}</span>
            </SelectItem>
          )}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.icon}
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
