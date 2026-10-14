import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Anchored catalog section (`#colors`, `#buttons`…) — listed in the table of contents. */
export function DsSection({
  id,
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} data-ds-section className="scroll-mt-32 space-y-5 xl:scroll-mt-24">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-extrabold tracking-tight">
            <a href={`#${id}`} className="hover:text-primary">
              {title}
            </a>
          </h2>
          {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
        </div>
      </header>
      <div className={cn("grid gap-5", className)}>{children}</div>
    </section>
  );
}

/** Small heading inside a section. */
export function DsSubheading({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className="text-sm font-bold">{children}</h3>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
