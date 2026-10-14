import { connection } from "next/server";
import { isLocale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { messages } from "@/i18n/messages";
import { blogTypes } from "@/lib/content";
import { formatDate, toPersianDigits } from "@/lib/format";
import { ogContentType, ogDomain, ogSize, renderOgImage } from "@/components/site/og";
import { getPublicProfile, getPublishedPost } from "@/server/modules/content/queries";

export const alt = "Article cover";
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
    getPublishedPost(locale, [...blogTypes], slug),
    getPublicProfile(),
  ]);
  const author = post?.authorName ?? profile.ownerName[locale];
  return renderOgImage({
    locale,
    title: post?.title ?? t.common.notFoundTitle,
    eyebrow: post ? t.site[`type_${post.type}`] : undefined,
    brand: profile.brandName[locale] || t.common.appName,
    footer: post
      ? [
          author,
          formatDate(post.publishedAt, { locale }),
          post.readingMinutes
            ? format(t.site.minRead, {
                n: locale === "fa" ? toPersianDigits(post.readingMinutes) : post.readingMinutes,
              })
            : "",
        ]
      : [],
    domain: ogDomain(),
  });
}
