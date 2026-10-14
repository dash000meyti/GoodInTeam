"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

/**
 * Switch for <form action>: always submits "true"/"false"
 * (an unchecked checkbox would be missing from FormData).
 */
export function SwitchInput({
  name,
  defaultChecked,
  onChange,
  id,
}: {
  name: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  id?: string;
}) {
  const [checked, setChecked] = useState(!!defaultChecked);
  return (
    <>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={(c) => {
          setChecked(c);
          onChange?.(c);
        }}
      />
    </>
  );
}
