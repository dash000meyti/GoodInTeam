"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ColorDot } from "@/components/shared/color-dot";
import { DatePicker } from "@/components/shared/date-picker";
import { SelectField } from "@/components/shared/select-field";
import { useT } from "@/i18n/client";
import type { TxFormOptions } from "../_lib/options";

export interface TxFilterValues {
  q?: string;
  kind?: string;
  accountId?: string;
  categoryId?: string;
  projectId?: string;
  clientId?: string;
  from?: string;
  to?: string;
}

const keys: (keyof TxFilterValues)[] = [
  "q",
  "kind",
  "accountId",
  "categoryId",
  "projectId",
  "clientId",
  "from",
  "to",
];

/** Filter bar that writes filters to the URL (server renders the results). */
export function TransactionFilters({
  values,
  options,
  basePath,
}: {
  values: TxFilterValues;
  options: Pick<TxFormOptions, "accounts" | "categories" | "projects" | "clients">;
  basePath: string;
}) {
  const t = useT();
  const f = t.finance;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(values.q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const push = (patch: Partial<TxFilterValues>) => {
    const next = { ...values, ...patch };
    const qs = new URLSearchParams();
    for (const k of keys) if (next[k]) qs.set(k, next[k]!);
    const url = qs.size ? `${basePath}?${qs}` : basePath;
    start(() => router.push(url, { scroll: false }));
  };

  const active = keys.some((k) => values[k]);
  const dot = (color: string | null) => <ColorDot color={color} />;

  return (
    <Card className="mb-6 gap-3 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              const v = e.target.value;
              setQ(v);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => push({ q: v.trim() || undefined }), 450);
            }}
            placeholder={f.searchTx}
            aria-label={t.common.search}
            className="ps-9"
          />
          {pending && (
            <Loader2Icon className="absolute inset-y-0 end-3 my-auto size-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <ToggleGroup
          type="single"
          value={values.kind ?? "all"}
          onValueChange={(v) => v && push({ kind: v === "all" ? undefined : v })}
          className="w-full md:w-fit"
          aria-label={f.filters}
        >
          {(["all", "income", "expense", "transfer"] as const).map((k) => (
            <ToggleGroupItem key={k} value={k} className="flex-1 md:flex-none">
              {k === "all" ? f.allKinds : f[`kind_${k}`]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <SelectField
          size="sm"
          value={values.accountId ?? ""}
          onChange={(v) => push({ accountId: v || undefined })}
          noneLabel={f.allAccounts}
          placeholder={f.allAccounts}
          options={options.accounts.map((a) => ({
            value: a.id,
            label: (
              <span className="flex items-center gap-2">
                {dot(a.color)}
                {a.name}
              </span>
            ),
          }))}
        />
        <SelectField
          size="sm"
          value={values.categoryId ?? ""}
          onChange={(v) => push({ categoryId: v || undefined })}
          noneLabel={f.allCategories}
          placeholder={f.allCategories}
          options={[
            { value: "none", label: f.uncategorized },
            ...options.categories.map((c) => ({
              value: c.id,
              label: (
                <span className="flex items-center gap-2">
                  {dot(c.color)}
                  {c.name}
                </span>
              ),
            })),
          ]}
        />
        <SelectField
          size="sm"
          value={values.projectId ?? ""}
          onChange={(v) => push({ projectId: v || undefined })}
          noneLabel={f.allProjects}
          placeholder={f.allProjects}
          options={options.projects.map((p) => ({
            value: p.id,
            label: (
              <span className="flex items-center gap-2">
                {dot(p.color)}
                {p.name}
              </span>
            ),
          }))}
        />
        <SelectField
          size="sm"
          value={values.clientId ?? ""}
          onChange={(v) => push({ clientId: v || undefined })}
          noneLabel={f.allClients}
          placeholder={f.allClients}
          options={options.clients.map((c) => ({ value: c.id, label: c.name }))}
        />
        <DatePicker
          value={values.from ?? null}
          onChange={(v) => push({ from: v ?? undefined })}
          placeholder={f.fromDate}
          className="[&_[data-slot=button]]:h-8"
        />
        <DatePicker
          value={values.to ?? null}
          onChange={(v) => push({ to: v ?? undefined })}
          placeholder={f.toDate}
          className="[&_[data-slot=button]]:h-8"
        />
      </div>
      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => {
            setQ("");
            start(() => router.push(basePath, { scroll: false }));
          }}
        >
          <XIcon /> {f.clearFilters}
        </Button>
      )}
    </Card>
  );
}
