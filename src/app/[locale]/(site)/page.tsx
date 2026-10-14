import Link from "next/link";
import { Button } from "@/components/ui/button";
import { localePath } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";

export default async function HomePage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-grid mask-radial absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-28 text-center">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {t.site.heroEyebrow}
        </span>
        <h1 className="text-4xl leading-tight font-black tracking-tight text-balance sm:text-6xl">
          {t.site.heroTitle}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t.site.heroSubtitle}</p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href={localePath(locale, "/contact")}>{t.site.heroPrimaryCta}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={localePath(locale, "/work")}>{t.site.heroSecondaryCta}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
