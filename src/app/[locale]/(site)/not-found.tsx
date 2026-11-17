import { NotFoundBox } from "@/components/site/ui";
import { getLocale, getMessages } from "@/i18n/server";

/** 404 inside the public layout (menu bar, footer and dock stay): the macOS-alert box. */
export default async function SiteNotFound() {
  const locale = await getLocale();
  const t = getMessages(locale);
  return <NotFoundBox locale={locale} t={t} />;
}
