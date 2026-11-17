import type { Metadata } from "next";
import { BrandPage, brandPageMetadata } from "@/components/site/brand-page";

/** Good In Studio's landing page (one shared BrandPage per sub-brand). */
export function generateMetadata(): Promise<Metadata> {
  return brandPageMetadata("studio");
}

export default function StudioPage() {
  return <BrandPage id="studio" />;
}
