import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ClockIcon, MailIcon, MapPinIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactForm } from "@/components/site/contact-form";
import { ids, JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { homeCrumb, sp } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata } from "@/components/site/seo";
import { SocialLinks } from "@/components/site/social-links";
import { Container } from "@/components/site/ui";
import { localePath, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages } from "@/i18n/server";
import { budgetRanges } from "@/lib/content";
import { getPublicProfile, listServices } from "@/server/modules/content/queries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getMessages(locale);
  return pageMetadata({
    locale,
    path: "/contact",
    title: t.site.contactTitle,
    description: t.site.contactSubtitle,
  });
}

async function Form({
  locale,
  t,
  searchParams,
}: {
  locale: Locale;
  t: Messages;
  searchParams: PageProps<"/[locale]/contact">["searchParams"];
}) {
  const q = await searchParams;
  const services = await listServices(locale);
  const s = t.site;
  const wanted = sp(q.service);
  return (
    <ContactForm
      source={`contact-form${wanted ? `:${wanted}` : ""}`}
      defaultService={services.some((x) => x.slug === wanted) ? wanted : undefined}
      services={services.map((x) => ({ value: x.slug, label: x.title }))}
      budgets={budgetRanges.map((b) => ({ value: b, label: s[`budget_${b}`] }))}
      labels={{
        name: s.formName,
        email: s.formEmail,
        phone: s.formPhone,
        company: s.formCompany,
        service: s.formService,
        servicePlaceholder: s.formServicePlaceholder,
        serviceOther: s.formServiceOther,
        budget: s.formBudget,
        message: s.formMessage,
        messagePlaceholder: s.formMessagePlaceholder,
        send: s.formSend,
        sending: s.formSending,
        privacy: s.formPrivacy,
        successTitle: s.successTitle,
        successBody: s.successBody,
        sendAnother: s.sendAnother,
        optional: t.common.optional,
      }}
    />
  );
}

async function DirectContact({ locale, t }: { locale: Locale; t: Messages }) {
  await connection();
  const p = await getPublicProfile();
  return (
    <>
      <JsonLd
        data={{
          "@type": "ContactPage",
          url: absoluteUrl(localePath(locale, "/contact")),
          name: t.site.contactTitle,
          about: { "@id": ids.organization() },
        }}
      />
      <ul className="space-y-4 text-sm">
        {p.email && (
          <li>
            <a
              href={`mailto:${p.email}`}
              className="flex items-center gap-3 font-semibold hover:text-primary"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <MailIcon className="size-5" />
              </span>
              <span dir="ltr">{p.email}</span>
            </a>
          </li>
        )}
        {p.location[locale] && (
          <li className="flex items-center gap-3 font-semibold">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <MapPinIcon className="size-5" />
            </span>
            {p.location[locale]}
          </li>
        )}
        <li className="flex items-center gap-3 font-semibold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <ClockIcon className="size-5" />
          </span>
          {t.site.responseTime}
        </li>
      </ul>
      <div className="mt-6 border-t border-dashed pt-6">
        <SocialLinks socials={p.socials} />
      </div>
    </>
  );
}

export default async function ContactPage({ searchParams }: PageProps<"/[locale]/contact">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  const s = t.site;
  return (
    <section className="relative -mt-16 overflow-hidden pt-16">
      <div
        aria-hidden
        className="bg-grid mask-fade-b absolute inset-0 -z-10 h-[32rem] opacity-70"
      />
      <div aria-hidden className="gt-glow start-[30%] -top-40 -z-10 size-[28rem] bg-primary/15" />
      <Container className="pt-10 pb-10 sm:pt-14">
        <Breadcrumbs
          items={[homeCrumb(locale), { name: t.nav.contact, path: localePath(locale, "/contact") }]}
        />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
          <div className="space-y-6">
            <h1 className="text-4xl leading-[1.15] font-black tracking-tight text-balance sm:text-6xl">
              {s.contactTitle}
            </h1>
            <p className="text-lg leading-8 text-pretty text-muted-foreground">
              {s.contactSubtitle}
            </p>
            <div className="rounded-3xl border border-border bg-card/70 p-6 backdrop-blur">
              <p className="mb-4 text-sm font-black">{s.contactDirect}</p>
              <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                <DirectContact locale={locale} t={t} />
              </Suspense>
            </div>
          </div>
          <div className="rounded-3xl bg-card p-6 shadow-card sm:p-10 dark:border dark:border-border">
            <Suspense
              fallback={
                <div className="grid gap-5 sm:grid-cols-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  ))}
                  <Skeleton className="h-40 w-full rounded-xl sm:col-span-2" />
                  <Skeleton className="h-12 w-40 rounded-full sm:col-span-2 sm:justify-self-end" />
                </div>
              }
            >
              <Form locale={locale} t={t} searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </Container>
    </section>
  );
}
