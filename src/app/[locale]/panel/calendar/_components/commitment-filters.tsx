"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorDot } from "@/components/shared/color-dot";
import { SelectField } from "@/components/shared/select-field";
import type { CalendarRef } from "@/components/calendar/types";
import { useT } from "@/i18n/client";

/** Client / project filters for the commitments page (stored in the URL). */
export function CommitmentFilters({
  clients,
  projects,
  clientId,
  projectId,
}: {
  clients: CalendarRef[];
  projects: CalendarRef[];
  clientId: string | null;
  projectId: string | null;
}) {
  const t = useT();
  const c = t.calendar;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const go = (next: { client?: string | null; project?: string | null }) => {
    const params = new URLSearchParams();
    const client = next.client !== undefined ? next.client : clientId;
    const project = next.project !== undefined ? next.project : projectId;
    if (client) params.set("client", client);
    if (project) params.set("project", project);
    const qs = params.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SelectField
        size="sm"
        className="w-44"
        value={clientId ?? ""}
        onChange={(v) => go({ client: v || null })}
        noneLabel={c.filterClient}
        placeholder={c.filterClient}
        options={clients.map((x) => ({
          value: x.id,
          label: x.name,
          icon: <ColorDot color={x.color} />,
        }))}
      />
      <SelectField
        size="sm"
        className="w-44"
        value={projectId ?? ""}
        onChange={(v) => go({ project: v || null })}
        noneLabel={c.filterProject}
        placeholder={c.filterProject}
        options={projects.map((x) => ({
          value: x.id,
          label: x.name,
          icon: <ColorDot color={x.color} />,
        }))}
      />
      {(clientId || projectId) && (
        <Button variant="ghost" size="sm" onClick={() => go({ client: null, project: null })}>
          <XIcon /> {c.clearFilters}
        </Button>
      )}
      {pending && <Loader2Icon aria-hidden className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
