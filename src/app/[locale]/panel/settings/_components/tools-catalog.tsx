"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

export interface ToolSummary {
  name: string;
  title: string;
  description: string;
  scope: "read" | "write";
  destructive?: boolean;
}

/** Searchable list of the MCP/REST tools the current user can call. */
export function ToolsCatalog({ tools }: { tools: ToolSummary[] }) {
  const t = useT();
  const s = t.settings;
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hits = needle
      ? tools.filter((tool) =>
          `${tool.name} ${tool.title} ${tool.description}`.toLowerCase().includes(needle),
        )
      : tools;
    const map = new Map<string, ToolSummary[]>();
    for (const tool of hits) {
      const mod = tool.name.includes("_") ? tool.name.split("_")[0]! : "system";
      map.set(mod, [...(map.get(mod) ?? []), tool]);
    }
    return [...map.entries()];
  }, [tools, q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={s.toolsSearch}
          className="ps-9"
          aria-label={s.toolsSearch}
        />
      </div>
      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{s.toolsEmpty}</p>
      ) : (
        <div className="space-y-5">
          {groups.map(([mod, list]) => (
            <section key={mod} className="space-y-2">
              <h3
                className="font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase"
                dir="ltr"
              >
                {mod}
              </h3>
              <ul className="grid gap-2 md:grid-cols-2">
                {list.map((tool) => (
                  <li
                    key={tool.name}
                    dir="ltr"
                    className="space-y-1.5 rounded-xl border border-dashed p-3 text-start transition-colors hover:border-primary/40 hover:bg-primary/4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-[13px] font-bold">{tool.name}</code>
                      <Badge variant={tool.scope === "read" ? "info" : "warning"}>
                        {s[`scope_${tool.scope}`]}
                      </Badge>
                      {tool.destructive && <Badge variant="destructive">{s.destructive}</Badge>}
                    </div>
                    <p className="text-sm font-semibold" lang="en">
                      {tool.title}
                    </p>
                    <p
                      className="line-clamp-2 text-xs text-muted-foreground"
                      lang="en"
                      title={tool.description}
                    >
                      {tool.description}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
