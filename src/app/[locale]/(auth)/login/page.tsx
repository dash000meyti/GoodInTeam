import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import { hasOwner } from "@/server/modules/users/service";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getLocale());
  return { title: t.auth.loginTitle, robots: { index: false, follow: false } };
}

async function SetupHint() {
  await connection();
  if (hasOwner()) return null;
  const locale = await getLocale();
  return (
    <Link
      href={localePath(locale, "/setup")}
      className="block rounded-xl border border-dashed border-primary/50 bg-primary/8 p-4 text-sm font-semibold text-primary-dark dark:text-primary-light"
    >
      {getMessages(locale).auth.setupTitle} →
    </Link>
  );
}

export default async function LoginPage() {
  const t = getMessages(await getLocale());
  return (
    <div className="grid gap-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">{t.auth.loginTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.clientHint}</p>
      </div>
      <Suspense fallback={null}>
        <SetupHint />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
