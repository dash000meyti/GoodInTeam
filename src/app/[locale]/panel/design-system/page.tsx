import type { Metadata } from "next";
import { BotIcon } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { getLocale, getMessages } from "@/i18n/server";
import { panelContext } from "@/server/page-context";
import { BadgesSection, ButtonsSection } from "./_components/sections/buttons-badges";
import { ColorsSection } from "./_components/sections/colors";
import { DataSection } from "./_components/sections/data-display";
import {
  ChartsSection,
  FeedbackSection,
  FormsSection,
  MarkdownSection,
  NavigationSection,
  OverlaysSection,
} from "./_components/sections/interactive";
import { SurfacesSection } from "./_components/sections/surfaces";
import { TypographySection } from "./_components/sections/typography";
import { Toc } from "./_components/toc";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getLocale());
  return { title: t.designSystem.title };
}

/**
 * Panel → Design system: a living catalog of tokens and components with
 * copyable usage snippets (for the owner and for AI agents). Owner/admin.
 */
export default async function DesignSystemPage() {
  const { t, href, locale, now } = await panelContext({ roles: ["owner", "admin"] });
  const d = t.designSystem;
  const toc = [
    { id: "colors", label: d.sec_colors },
    { id: "typography", label: d.sec_typography },
    { id: "buttons", label: d.sec_buttons },
    { id: "badges", label: d.sec_badges },
    { id: "surfaces", label: d.sec_surfaces },
    { id: "forms", label: d.sec_forms },
    { id: "overlays", label: d.sec_overlays },
    { id: "navigation", label: d.sec_navigation },
    { id: "data", label: d.sec_data },
    { id: "charts", label: d.sec_charts },
    { id: "markdown", label: d.sec_markdown },
    { id: "feedback", label: d.sec_feedback },
  ];

  return (
    <>
      <PageHeader
        title={d.title}
        description={d.subtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: d.title }]}
      />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-10">
        <div className="min-w-0 space-y-14">
          <Toc items={toc} title={d.onThisPage} variant="bar" />

          <aside className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/6 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-primary">
                <BotIcon className="size-5" />
              </span>
              <div className="min-w-0 space-y-2">
                <h2 className="font-extrabold">{d.agentsTitle}</h2>
                <p className="text-sm text-muted-foreground">{d.agentsBody}</p>
                <ul className="grid gap-x-6 gap-y-1.5 text-sm md:grid-cols-2">
                  {[d.rule1, d.rule2, d.rule3, d.rule4, d.rule5].map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <p className="pt-1 font-mono text-xs text-muted-foreground" dir="ltr">
                  docs/design-system.md · AGENTS.md · src/components/{"{ui,shared,panel}"}
                </p>
              </div>
            </div>
          </aside>

          <ColorsSection t={t} />
          <TypographySection t={t} />
          <ButtonsSection t={t} />
          <BadgesSection t={t} />
          <SurfacesSection t={t} locale={locale} />
          <FormsSection t={t} />
          <OverlaysSection t={t} />
          <NavigationSection t={t} />
          <DataSection t={t} locale={locale} now={now} />
          <ChartsSection t={t} />
          <MarkdownSection t={t} />
          <FeedbackSection t={t} />
        </div>
        <div className="hidden xl:block">
          <Toc items={toc} title={d.onThisPage} variant="side" />
        </div>
      </div>
    </>
  );
}
