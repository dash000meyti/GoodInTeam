import { connection } from "next/server";
import { isLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { toPersianDigits } from "@/lib/format";
import { ogContentType, ogDomain, ogSize, renderOgImage } from "@/components/site/og";
import { getPublicProfile, getPublishedPost } from "@/server/modules/content/queries";

export const alt = "Case study";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  await connection();
  const p = await params;
  const locale = isLocale(p.locale) ? p.locale : "fa";
  const t = messages[locale];
  let slug = p.slug;
  try {
    slug = decodeURIComponent(slug);
  } catch {}
  const [post, profile] = await Promise.all([
    getPublishedPost(locale, ["work"], slug),
    getPublicProfile(),
  ]);
  const metric = post?.meta.metrics?.[0];
  const year = post?.meta.year
    ? locale === "fa"
      ? toPersianDigits(post.meta.year)
      : String(post.meta.year)
    : "";
  return renderOgImage({
    locale,
    title: post?.title ?? t.common.notFoundTitle,
    eyebrow: t.site.type_work,
    brand: profile.brandName[locale] || t.common.appName,
    footer: post
      ? [post.meta.client ?? "", year, metric ? `${metric.value} ${metric.label}` : ""]
      : [],
    domain: ogDomain(),
  });
}
