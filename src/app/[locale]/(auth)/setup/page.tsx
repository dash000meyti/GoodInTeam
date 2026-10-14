import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import { hasOwner } from "@/server/modules/users/service";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function Gate() {
  await connection();
  const locale = await getLocale();
  if (hasOwner()) redirect(localePath(locale, "/login"));
  return <SetupForm />;
}

export default async function SetupPage() {
  const t = getMessages(await getLocale());
  return (
    <div className="grid gap-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">{t.auth.setupTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.setupSubtitle}</p>
      </div>
      <Suspense fallback={<Skeleton className="h-80" />}>
        <Gate />
      </Suspense>
    </div>
  );
}
