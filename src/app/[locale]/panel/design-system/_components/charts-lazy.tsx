"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** Recharts is heavy — load the chart demos after the rest of the catalog. */
const loading = () => <Skeleton className="h-56 w-full rounded-xl" />;

export const LazyBarChart = dynamic(() => import("./charts-demo").then((m) => m.BarChartDemo), {
  ssr: false,
  loading,
});
export const LazyAreaChart = dynamic(() => import("./charts-demo").then((m) => m.AreaChartDemo), {
  ssr: false,
  loading,
});
export const LazyDonutChart = dynamic(() => import("./charts-demo").then((m) => m.DonutChartDemo), {
  ssr: false,
  loading,
});
