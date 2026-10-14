import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Standard page heading for every panel page:
 * <PageHeader title="Time" description="…" crumbs={[…]} actions={<Button/>} />
 */
export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {crumbs && crumbs.length > 0 && (
          <nav
            aria-label="breadcrumb"
            className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="size-1 rounded-full bg-grey-500" />}
                {c.href ? (
                  <Link href={c.href} className="hover:text-foreground hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-foreground/70">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4 ltr:rotate-0 rtl:rotate-180" />
      {label}
    </Link>
  );
}
