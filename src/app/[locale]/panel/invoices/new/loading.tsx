import { PageSkeleton } from "@/components/panel/page-skeleton";

/** Suspense boundary so navigations inside this segment stream instantly. */
export default function Loading() {
  return <PageSkeleton />;
}
