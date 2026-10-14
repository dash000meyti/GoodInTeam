import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { getLocale, getMessages } from "@/i18n/server";
import { panelContext } from "@/server/page-context";
import { SettingsNav } from "./_components/settings-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getLocale());
  return { title: t.settings.title };
}

/**
 * Settings area shell: one PageHeader + section navigation (role-filtered).
 * Sub-pages render their own heading and stream inside ./loading.tsx.
 */
export default async function SettingsLayout({
  children,
}: LayoutProps<"/[locale]/panel/settings">) {
  const { actor, t, href } = await panelContext();
  return (
    <>
      <PageHeader
        title={t.settings.title}
        description={t.settings.subtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: t.settings.title }]}
      />
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <SettingsNav role={actor.user.role} />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
