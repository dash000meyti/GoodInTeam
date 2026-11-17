import { BrandPageSkeleton } from "@/components/site/brand-page";

/** Same boxes and cells as the brand page while it loads. */
export default function Loading() {
  return <BrandPageSkeleton suffix="STUDIO" />;
}
