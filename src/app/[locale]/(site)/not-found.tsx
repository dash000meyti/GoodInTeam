import Link from "next/link";
import { BookOpenIcon, BriefcaseIcon, HomeIcon, MailIcon, NewspaperIcon } from "lucide-react";
import { Container } from "@/components/site/ui";
import { localePath } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";

/** 404 inside the public layout (header/footer stay). */
export default async function SiteNotFound() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const links = [
    { href: "/", label: t.common.goHome, icon: HomeIcon },
    { href: "/work", label: t.nav.work, icon: BriefcaseIcon },
    { href: "/blog", label: t.nav.blog, icon: NewspaperIcon },
    { href: "/learn", label: t.nav.learn, icon: BookOpenIcon },
    { href: "/contact", label: t.nav.contact, icon: MailIcon },
  ];
  return (
    <section className="relative isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 bottom-0 -z-10 overflow-hidden"
      >
        <div aria-hidden className="bg-grid mask-radial absolute inset-0 -z-10" />
        <div
          aria-hidden
          className="gt-glow start-1/2 top-10 -z-10 h-72 w-[36rem] -translate-x-1/2 bg-primary/20 rtl:translate-x-1/2"
        />
      </div>
      <Container className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 py-20 text-center">
        <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-bold text-muted-foreground">
          {t.site.notFoundEyebrow}
        </span>
        <p
          aria-hidden
          className="gt-accent text-[7rem] leading-none font-black tracking-tighter sm:text-[10rem]"
        >
          404
        </p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t.common.notFoundTitle}</h1>
        <p className="max-w-md leading-8 text-muted-foreground">{t.common.notFoundBody}</p>
        <p className="mt-4 text-sm font-semibold">{t.site.notFoundSuggestions}</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={localePath(locale, l.href)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
              >
                <l.icon className="size-4" />
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
