import { brandOgAlt, brandOgImage } from "@/components/site/brand-og";
import { ogContentType, ogSize } from "@/components/site/og";

/** Good In Studio's social card: the default card with its own pixel logo (static). */
export const alt = brandOgAlt("studio");
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  return brandOgImage("studio", (await params).locale);
}
