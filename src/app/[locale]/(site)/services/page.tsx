import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpLeftIcon, CheckIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Faq, generalFaq } from "@/components/site/faq";
import { CtaBand } from "@/components/site/home/sections";
import { ids, JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { homeCrumb } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata } from "@/components/site/seo";
import { ServiceIcon } from "@/components/site/service-icon";
import { Container, fmtNum, PageHero, SectionHeading } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { postHref } from "@/lib/content";
import { listServices } from "@/server/modules/content/queries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  return pageMetadata({
    locale,
    path: "/services",
    title: t.site.servicesPageTitle,
    description: t.site.servicesPageSubtitle,
  });
}

async function ServicesGrid({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const items = await listServices(locale);
  return (
    <>
      <JsonLd
        data={{
          "@type": "ItemList",
          itemListElement: items.map((svc, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Service",
              name: svc.title,
              description: svc.excerpt ?? undefined,
              url: absoluteUrl(postHref(locale, svc)),
              provider: { "@id": ids.organization() },
              areaServed: locale === "fa" ? "IR" : "Worldwide",
            },
          })),
        }}
      />
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((svc, i) => (
          <article
            key={svc.id}
            className="gt-lift group relative flex flex-col gap-5 overflow-hidden rounded-3xl bg-card p-8 shadow-card dark:border dark:border-border"
          >
            <div
              aria-hidden
              className="bg-dots mask-radial absolute -end-16 -top-16 size-72 opacity-60"
            />
            <div className="relative flex items-center justify-between">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
                <ServiceIcon name={svc.meta.icon} className="size-7" />
              </span>
              <span className="font-mono text-sm font-bold text-muted-foreground/50">
                {fmtNum(i + 1, locale).padStart(2, locale === "fa" ? "۰" : "0")}
              </span>
            </div>
            <h2 className="relative text-2xl font-extrabold tracking-tight">
              <Link href={postHref(locale, svc)} className="after:absolute after:inset-0">
                {svc.title}
              </Link>
            </h2>
            {svc.excerpt && (
              <p className="relative leading-8 text-muted-foreground">{svc.excerpt}</p>
            )}
            {svc.highlights.length > 0 && (
              <ul className="relative grid gap-2 sm:grid-cols-2">
                {svc.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm font-semibold">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" /> {h}
                  </li>
                ))}
              </ul>
            )}
            <span className="relative mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-primary">
              {t.site.viewDetails}
              <ArrowUpLeftIcon className="size-4 transition-transform group-hover:-translate-y-0.5 ltr:rotate-90" />
            </span>
          </article>
        ))}
      </div>
    </>
  );
}

export default async function ServicesPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const s = t.site;
  const steps = [
    { title: s.step1Title, body: s.step1Body },
    { title: s.step2Title, body: s.step2Body },
    { title: s.step3Title, body: s.step3Body },
    { title: s.step4Title, body: s.step4Body },
  ];
  return (
    <>
      <PageHero
        crumbs={
          <Breadcrumbs
            items={[
              homeCrumb(locale),
              { name: s.servicesPageTitle, path: localePath(locale, "/services") },
            ]}
          />
        }
        title={s.servicesPageTitle}
        subtitle={s.servicesPageSubtitle}
      />
      <Container>
        <Suspense
          fallback={
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-80 rounded-3xl" />
              ))}
            </div>
          }
        >
          <ServicesGrid locale={locale} t={t} />
        </Suspense>
      </Container>

      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading eyebrow={s.processEyebrow} title={s.processStepsTitle} align="center" />
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-x-[12%] top-7 hidden border-t-2 border-dashed border-border md:block"
            />
            <ol className="relative grid gap-6 md:grid-cols-4">
              {steps.map((st, i) => (
                <li
                  key={st.title}
                  className="relative flex flex-col items-center gap-3 text-center"
                >
                  <span className="relative flex size-14 items-center justify-center rounded-2xl bg-grey-900 text-lg font-black text-white shadow-card ring-8 ring-background dark:bg-primary dark:text-primary-foreground">
                    {fmtNum(i + 1, locale)}
                  </span>
                  <h3 className="text-lg font-extrabold">{st.title}</h3>
                  <p className="max-w-60 text-sm leading-7 text-muted-foreground">{st.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <Container className="max-w-4xl">
        <Faq items={generalFaq(t)} title={s.faqTitle} />
      </Container>
      <CtaBand locale={locale} t={t} className="mt-16" />
    </>
  );
}
