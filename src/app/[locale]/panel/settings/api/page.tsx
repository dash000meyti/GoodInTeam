import { BotIcon, FileJsonIcon, KeyRoundIcon, PlugZapIcon, WrenchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { format } from "@/i18n/format-message";
import { env } from "@/lib/env";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";
import { toolsFor } from "@/server/api/registry";
import { listTokens } from "@/server/modules/api-tokens/service";
import { panelContext } from "@/server/page-context";
import { CreateTokenDialog, RevokeTokenButton } from "../_components/api-tokens";
import { CodeField } from "../_components/code-field";
import { SettingsCard, SettingsHeader } from "../_components/section";
import { ToolsCatalog } from "../_components/tools-catalog";

/** Settings → API & AI agents (staff): personal tokens + the tool catalog. */
export default async function ApiSettingsPage() {
  const { actor, t, fmt, now, locale } = await panelContext({
    roles: ["owner", "admin", "member"],
  });
  const s = t.settings;
  const tokens = listTokens(actor);
  const tools = toolsFor(actor).map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    scope: tool.scope,
    destructive: tool.destructive,
  }));
  const siteUrl = env.siteUrl;

  return (
    <div className="space-y-6">
      <SettingsHeader title={s.apiTitle} description={s.apiSubtitle} />

      <SettingsCard icon={PlugZapIcon} title={s.connectTitle}>
        <ol className="grid gap-3 md:grid-cols-3">
          {[s.connectStep1, s.connectStep2, s.connectStep3].map((step, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-muted/50 p-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {formatNumber(i + 1, locale)}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <CodeField label={s.mcpEndpoint} value={`${siteUrl}/api/mcp`} />
          <CodeField label={s.restEndpoint} value={`${siteUrl}/api/v1/tools/{name}`} />
          <CodeField
            className="md:col-span-2"
            multiline
            value={`claude mcp add --transport http good-team ${siteUrl}/api/mcp --header "Authorization: Bearer gt_…"`}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/api/v1/openapi.json" target="_blank" rel="noopener">
              <FileJsonIcon /> {s.openapiDocs}
            </a>
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={KeyRoundIcon}
        title={s.myTokens}
        description={s.myTokensHint}
        action={<CreateTokenDialog siteUrl={siteUrl} />}
      >
        {tokens.length === 0 ? (
          <EmptyState icon={BotIcon} title={s.noTokens} description={s.noTokensHint} />
        ) : (
          <ul className="divide-y divide-dashed">
            {tokens.map((tok) => {
              const expired = !!tok.expiresAt && tok.expiresAt.getTime() < now;
              return (
                <li
                  key={tok.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5 first:pt-0 last:pb-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <KeyRoundIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{tok.name}</span>
                      <code
                        className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]"
                        dir="ltr"
                      >
                        {tok.prefix}…
                      </code>
                      {tok.scopes.map((sc) => (
                        <Badge key={sc} variant={sc === "read" ? "info" : "warning"}>
                          {s[`scope_${sc}`]}
                        </Badge>
                      ))}
                      {expired && <Badge variant="destructive">{s.expired}</Badge>}
                    </div>
                    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {s.lastUsed}:{" "}
                        {tok.lastUsedAt ? formatRelative(tok.lastUsedAt, fmt, now) : s.neverUsed}
                      </span>
                      <span>
                        {s.expires}:{" "}
                        {tok.expiresAt ? formatDate(tok.expiresAt, fmt) : s.neverExpires}
                      </span>
                      <span>
                        {s.createdAt}: {formatDate(tok.createdAt, fmt)}
                      </span>
                    </p>
                  </div>
                  <RevokeTokenButton id={tok.id} name={tok.name} />
                </li>
              );
            })}
          </ul>
        )}
      </SettingsCard>

      <SettingsCard
        icon={WrenchIcon}
        title={s.toolsTitle}
        description={format(s.toolsHint, { n: formatNumber(tools.length, locale) })}
      >
        <ToolsCatalog tools={tools} />
      </SettingsCard>
    </div>
  );
}
