import type { Metadata } from "next";
import { BrandPage, brandPageMetadata } from "@/components/site/brand-page";

/** Good In Code's landing page (one shared BrandPage per sub-brand). */
export function generateMetadata(): Promise<Metadata> {
  return brandPageMetadata("code");
}

export default function CodePage() {
  return <BrandPage id="code" />;
}
