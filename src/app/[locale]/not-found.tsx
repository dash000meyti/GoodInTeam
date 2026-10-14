import Link from "next/link";
import { Button } from "@/components/ui/button";
import { localePath } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";

export default async function NotFound() {
  const locale = await getLocale();
  const t = getMessages(locale);
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center">
      <div aria-hidden className="bg-grid mask-radial absolute inset-0 -z-10" />
      <p className="text-gradient text-8xl font-black tracking-tighter">404</p>
      <h1 className="text-3xl font-extrabold">{t.common.notFoundTitle}</h1>
      <p className="max-w-md text-muted-foreground">{t.common.notFoundBody}</p>
      <Button asChild size="lg" variant="inherit">
        <Link href={localePath(locale, "/")}>{t.common.goHome}</Link>
      </Button>
    </main>
  );
}
