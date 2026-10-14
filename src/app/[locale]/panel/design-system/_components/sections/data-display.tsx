import { TableIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColorDot } from "@/components/shared/color-dot";
import { LiveDuration } from "@/components/shared/live-duration";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { formatHours, formatPercent } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { Example } from "../example";
import { DsSection } from "../section";

export function DataSection({ t, locale, now }: { t: Messages; locale: Locale; now: number }) {
  const d = t.designSystem;
  const rows = [
    {
      name: d.demoRow1,
      color: "#078DEE",
      ms: 41.5 * 3_600_000,
      status: "success" as const,
      label: d.st_active,
      amount: 185_000_000,
      cur: "IRT",
    },
    {
      name: d.demoRow2,
      color: "#FDA92D",
      ms: 12 * 3_600_000,
      status: "warning" as const,
      label: d.st_pending,
      amount: 42_000_000,
      cur: "IRT",
    },
    {
      name: d.demoRow3,
      color: "#7635DC",
      ms: 27.25 * 3_600_000,
      status: "info" as const,
      label: d.st_planning,
      amount: 320_000,
      cur: "USD",
    },
  ];
  return (
    <DsSection
      id="data"
      title={d.sec_data}
      description={d.sec_dataDesc}
      icon={TableIcon}
      className="lg:grid-cols-2"
    >
      <Example
        title={d.table}
        className="lg:col-span-2"
        previewClassName="block p-0 sm:p-0 bg-none"
        code={`<Card className="py-0">
  <Table>
    <TableHeader><TableRow><TableHead>…</TableHead></TableRow></TableHeader>
    <TableBody>
      <TableRow><TableCell>…</TableCell></TableRow>
    </TableBody>
  </Table>
</Card>
// Amounts: formatMoney(minor, currency, locale) · Hours: formatHours(ms, locale) · dates: formatDate(d, fmt)`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{d.t_project}</TableHead>
              <TableHead>{d.t_hours}</TableHead>
              <TableHead>{d.t_status}</TableHead>
              <TableHead className="text-end">{d.t_amount}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-semibold">
                  <span className="flex items-center gap-2">
                    <ColorDot color={r.color} /> {r.name}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">{formatHours(r.ms, locale)}</TableCell>
                <TableCell>
                  <Badge variant={r.status}>{r.label}</Badge>
                </TableCell>
                <TableCell className="text-end font-semibold tabular-nums">
                  {formatMoney(r.amount, r.cur, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Example>

      <Example
        title={d.progress}
        previewClassName="block space-y-4"
        code={`<Progress value={project.progress} />
<Progress value={40} indicatorClassName="bg-[var(--c)]" style={{ "--c": project.color }} />`}
      >
        {[25, 68, 100].map((v) => (
          <div key={v} className="flex items-center gap-3">
            <Progress value={v} className="flex-1" />
            <span className="w-10 text-xs font-bold tabular-nums">{formatPercent(v, locale)}</span>
          </div>
        ))}
        <Progress
          value={45}
          indicatorClassName="bg-[var(--c)]"
          style={{ "--c": "#7635DC" } as React.CSSProperties}
        />
      </Example>

      <Example
        title={`${d.avatar} · ${d.colorDot}`}
        code={`<Avatar><AvatarImage src={user.avatarUrl} alt="" /><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
<ColorDot color={project.color} />`}
      >
        <div className="flex -space-x-2 rtl:space-x-reverse">
          {["مر", "سم", "عک", "GT"].map((n) => (
            <Avatar key={n} className="size-10 ring-2 ring-card">
              <AvatarFallback>{n}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <Avatar className="size-12 rounded-xl">
          <AvatarFallback className="rounded-xl bg-[#078DEE] text-white">AA</AvatarFallback>
        </Avatar>
        <span className="flex items-center gap-2">
          {["#00A76F", "#078DEE", "#7635DC", "#FDA92D", "#FF5630"].map((c) => (
            <ColorDot key={c} color={c} className="size-3" />
          ))}
        </span>
      </Example>

      <Example
        title={`${d.kbd} · ${d.liveDuration}`}
        description={d.liveDurationHint}
        code={`<Kbd dir="ltr">⌘K</Kbd>
<LiveDuration since={entry.startedAt.getTime()} serverNow={ctx.now} className="font-mono" />`}
      >
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Kbd dir="ltr">⌘</Kbd>
          <Kbd dir="ltr">K</Kbd>
          {d.kbdHint}
        </span>
        <span className="flex items-center gap-2 rounded-xl bg-primary/8 px-3 py-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <LiveDuration
            since={now - (1 * 3600 + 23 * 60 + 9) * 1000}
            serverNow={now}
            className="font-mono text-lg font-bold"
          />
        </span>
      </Example>

      <Example
        title={d.skeleton}
        previewClassName="block"
        code={`<Skeleton className="h-4 w-48" />
// Route-level: loading.tsx → <PageSkeleton /> (components/panel/page-skeleton)`}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="mt-4 h-20 rounded-2xl" />
      </Example>
    </DsSection>
  );
}
