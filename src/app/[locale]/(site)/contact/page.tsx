import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ClockIcon, MailIcon, MapPinIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Window } from "@/components/shell/window";
import { ContactForm } from "@/components/site/contact-form";
import { FrameCell, FrameGrid, FrameSection } from "@/components/site/frame";
import { ids, JsonLd } from "@/components/site/json-ld";
import { Breadcrumbs } from "@/components/site/nav-bits";
import { homeCrumb, sp } from "@/components/site/page-utils";
import { absoluteUrl, pageMetadata } from "@/components/site/seo";
import { SocialLinks } from "@/components/site/social-links";
import { DecorWindowCell, teamPath, TitleCell } from "@/components/site/ui";
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
              className="flex items-center gap-3 font-semibold hover:text-primary-ink"
            >
              <span className={TILE}>
                <MailIcon className="size-5" aria-hidden />
              </span>
              <span dir="ltr">{p.email}</span>
            </a>
          </li>
        )}
        {p.location[locale] && (
          <li className="flex items-center gap-3 font-semibold">
            <span className={TILE}>
              <MapPinIcon className="size-5" aria-hidden />
            </span>
            {p.location[locale]}
          </li>
        )}
        <li className="flex items-center gap-3 font-semibold">
          <span className={TILE}>
            <ClockIcon className="size-5" aria-hidden />
          </span>
          {t.site.responseTime}
        </li>
      </ul>
      <div className="mt-6 border-t border-dashed border-frame-line pt-6">
        <SocialLinks socials={p.socials} />
      </div>
    </>
  );
}

const TILE =
  "flex size-10 shrink-0 items-center justify-center rounded-[8px] border border-frame-line bg-card";

/** Same fields, same heights, while the services list streams. */
function FormSkeleton() {
  return (
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
  );
}

/**
 * One box (spec §9): a header row (h1, subtitle, breadcrumbs + the decor
 * CONTACT.APP window) stacked on the form row (the form in a NEW-MESSAGE
 * window on dots, then the direct-contact cell). `?service=` preselects.
 */
export default async function ContactPage({ searchParams }: PageProps<"/[locale]/contact">) {
  const locale = await getLocale();
  const t = getMessages(locale);
  const s = t.site;
  return (
    <FrameSection
      id="top"
      first
      labelledBy="top-title"
      guide={{ key: "contact", say: t.guide.contact }}
      strip={{ index: 1, path: teamPath("CONTACT") }}
    >
      <FrameGrid cols="2-1">
        <TitleCell
          as="h1"
          titleId="top-title"
          className="lg:min-h-[200px]"
          crumbs={
            <Breadcrumbs
              items={[
                homeCrumb(locale),
                { name: t.nav.contact, path: localePath(locale, "/contact") },
              ]}
            />
          }
          title={s.contactTitle}
          subtitle={s.contactSubtitle}
        />
        <DecorWindowCell path="CONTACT.APP" icon="contact" />
      </FrameGrid>
      <FrameGrid cols="2-1">
        <FrameCell tone="dots" className="px-3 py-6 md:p-[var(--cell-pad)]">
          <Window path="NEW-MESSAGE">
            <div className="p-5 sm:p-8">
              <Suspense fallback={<FormSkeleton />}>
                <Form locale={locale} t={t} searchParams={searchParams} />
              </Suspense>
            </div>
          </Window>
        </FrameCell>
        <FrameCell as="aside" tone="card">
          <h2 className="mb-5 text-sm font-black">{s.contactDirect}</h2>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <DirectContact locale={locale} t={t} />
          </Suspense>
        </FrameCell>
      </FrameGrid>
    </FrameSection>
  );
}
