import {
  ArchiveRestoreIcon,
  CalendarClockIcon,
  DatabaseIcon,
  DownloadIcon,
  HardDriveIcon,
  ImagesIcon,
  Rows3Icon,
  TableIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/panel/stat-card";
import { format } from "@/i18n/format-message";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { localeMeta } from "@/i18n/config";
import { databaseStats } from "@/server/modules/settings/data";
import { formatBytes } from "@/server/modules/settings/utils";
import { panelContext } from "@/server/page-context";
import { CodeField } from "../_components/code-field";
import { SettingsCard, SettingsHeader } from "../_components/section";

const groupOrder = ["people", "work", "money", "knowledge", "site", "system"] as const;

/** Settings → Data & backup (owner only). */
export default async function DataSettingsPage() {
  const { actor, t, fmt, locale, now } = await panelContext({ roles: ["owner"] });
  const s = t.settings;
  const stats = databaseStats(actor);
  const intl = localeMeta[locale].intl;
  const bytes = (n: number) => formatBytes(n, intl);
  const num = (n: number) => formatNumber(n, locale);
  const latest = stats.backups.latest[0];

  return (
    <div className="space-y-6">
      <SettingsHeader title={s.dataTitle} description={s.dataSubtitle} />

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          label={s.dbSize}
          value={bytes(stats.files.db)}
          hint={format(s.dbSizeHint, { wal: bytes(stats.files.wal) })}
          icon={DatabaseIcon}
        />
        <StatCard
          label={s.totalRows}
          value={num(stats.totalRows)}
          hint={format(s.tablesCount, { n: num(stats.tables.length) })}
          icon={Rows3Icon}
          tone="info"
        />
        <StatCard
          label={s.uploadsSize}
          value={bytes(stats.uploads.bytes)}
          hint={format(s.uploadsHint, { n: num(stats.uploads.files) })}
          icon={ImagesIcon}
          tone="violet"
        />
        <StatCard
          label={s.serverBackups}
          value={num(stats.backups.count)}
          hint={
            latest
              ? format(s.serverBackupsHint, { date: formatRelative(latest.createdAt, fmt, now) })
              : s.noServerBackups
          }
          icon={HardDriveIcon}
          tone="warning"
        />
      </div>

      <SettingsCard
        icon={DownloadIcon}
        title={s.downloadTitle}
        description={s.downloadHint}
        action={
          <Button asChild>
            <a href="/api/backup" download>
              <DownloadIcon /> {s.downloadBackup}
            </a>
          </Button>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0 space-y-1 rounded-xl bg-muted/50 p-3">
            <dt className="text-xs font-semibold text-muted-foreground">{s.dataDir}</dt>
            <dd className="truncate font-mono text-xs" dir="ltr" title={stats.dataDir}>
              {stats.dataDir}
            </dd>
          </div>
          <div className="min-w-0 space-y-1 rounded-xl bg-muted/50 p-3">
            <dt className="text-xs font-semibold text-muted-foreground">{s.engine}</dt>
            <dd className="font-mono text-xs" dir="ltr">
              SQLite {stats.sqlite.version} · {stats.sqlite.journalMode.toUpperCase()} ·{" "}
              {formatNumber(stats.sqlite.pageCount, "en")} × {stats.sqlite.pageSize} B
            </dd>
          </div>
        </dl>
      </SettingsCard>

      <SettingsCard icon={TableIcon} title={s.tablesTitle}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groupOrder.map((g) => {
            const rows = stats.tables.filter((tb) => tb.group === g);
            if (!rows.length) return null;
            return (
              <section key={g} className="rounded-xl border border-dashed p-3">
                <h3 className="mb-2 text-xs font-bold text-muted-foreground">{s[`group_${g}`]}</h3>
                <ul className="space-y-1.5">
                  {rows.map((tb) => (
                    <li key={tb.name} className="flex items-center justify-between gap-3 text-sm">
                      <code className="font-mono text-xs" dir="ltr">
                        {tb.name}
                      </code>
                      <span className="font-semibold tabular-nums">{num(tb.rows)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </SettingsCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard icon={ArchiveRestoreIcon} title={s.restoreTitle}>
          <ol className="space-y-3 text-sm">
            {[s.restoreStep1, s.restoreStep2, s.restoreStep3].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                  {num(i + 1)}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <CodeField
            className="mt-4"
            multiline
            value={`docker compose stop app\ncp goodteam-backup-*.db /data/app.db && rm -f /data/app.db-wal /data/app.db-shm\ndocker compose start app`}
          />
        </SettingsCard>

        <SettingsCard icon={CalendarClockIcon} title={s.scheduleTitle} description={s.scheduleHint}>
          <CodeField
            multiline
            value={`30 3 * * * docker compose -f /srv/goodteam/docker-compose.yml exec -T app node scripts/backup.mjs`}
          />
          {stats.backups.latest.length > 0 && (
            <ul className="mt-4 divide-y divide-dashed text-xs">
              {stats.backups.latest.map((b) => (
                <li key={b.name} className="flex items-center gap-3 py-2">
                  <code className="flex-1 truncate font-mono" dir="ltr">
                    {b.name}
                  </code>
                  <Badge variant="neutral">{bytes(b.bytes)}</Badge>
                  <span className="text-muted-foreground">{formatDateTime(b.createdAt, fmt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SettingsCard>
      </div>
    </div>
  );
}
