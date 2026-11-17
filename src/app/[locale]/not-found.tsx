import { NotFoundBox } from "@/components/site/ui";
import { getLocale, getMessages } from "@/i18n/server";

/**
 * 404 outside the public layout: the same alert box on the desktop
 * wallpaper (`.os-desktop`, display:flow-root, never transformed).
 */
export default async function NotFound() {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <div className="os-desktop min-h-dvh pb-16">
      <main id="main" className="overflow-x-clip">
        <NotFoundBox locale={locale} t={t} />
      </main>
    </div>
  );
}
