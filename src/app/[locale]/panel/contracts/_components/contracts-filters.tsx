"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/shared/select-field";
import { useT } from "@/i18n/client";

/** Search + client filter. Writes to the URL (?q=&client=) so views are shareable. */
export function ContractsFilters({
  basePath,
  tab,
  q,
  clientId,
  clients,
}: {
  basePath: string;
  tab: string;
  q: string;
  clientId: string;
  clients: { id: string; name: string }[];
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(q);
  const first = useRef(true);

  const go = (next: { q?: string; client?: string }) => {
    const params = new URLSearchParams();
    if (tab && tab !== "all") params.set("tab", tab);
    const nq = next.q ?? text;
    const nc = next.client ?? clientId;
    if (nq.trim()) params.set("q", nq.trim());
    if (nc) params.set("client", nc);
    const qs = params.toString();
    start(() => router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  };

  // Debounced search-as-you-type.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => go({ q: text }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [text]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.contracts.searchPlaceholder}
          aria-label={t.common.search}
          className="ps-9 pe-9"
        />
        {pending && (
          <Loader2Icon className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {clients.length > 0 && (
        <div className="flex items-center gap-2">
          <SelectField
            value={clientId}
            onChange={(v) => go({ client: v })}
            noneLabel={t.contracts.allClients}
            placeholder={t.contracts.allClients}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            className="w-full sm:w-56"
          />
          {(clientId || q) && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.contracts.clearFilters}
              title={t.contracts.clearFilters}
              onClick={() => {
                setText("");
                go({ q: "", client: "" });
              }}
            >
              <XIcon />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
