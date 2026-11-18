import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import type { PixelIconName } from "@/components/brand/pixel-icons";
import { FrameBox, FrameCell, FrameGrid, HEADING_CLASS } from "@/components/shell/frame";
import { cn } from "@/lib/utils";
import { CrumbsNav } from "./crumbs-nav";
import { PanelDecorCell, PanelStrip } from "./page-frame";

export interface Crumb {
  label: string;
  href?: string;
}

/** Header row + the lg decor column: the decor stays narrow beside the title. */
const HEADER_GRID = "lg:grid-cols-[minmax(0,1fr)_minmax(200px,22%)]";

/**
 * The page's first box on every panel page (the site's first-box pattern at
 * panel density): a framed box with the strip (`GOOD-IN-TEAM/PANEL/<route>`),
 * a header cell with the crumbs, the h1 (frame heading scale), the
 * description and the actions at inline-end, and from lg a dots decor cell
 * with the module's `<APP>.APP` window. `children` are more rows of the same
 * box (a `StatRow`, a filter row): FrameGrids only.
 *
 * <PageHeader title="Time" description="…" crumbs={[…]} actions={<Button/>} />
 */
export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  path,
  icon,
  app,
  decor = true,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  /** Strip path after `GOOD-IN-TEAM/PANEL` (Latin; digits turn Persian on fa). Default: the route. */
  path?: readonly string[];
  /** Pixel icon of the decor window. Default: the route's module icon. */
  icon?: PixelIconName;
  /** Decor window name before `.APP`. Default: the route's module. */
  app?: string;
  /** The dots decor cell from lg (default on). */
  decor?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <FrameBox
      as="header"
      density="compact"
      className={cn("mb-6 lg:mb-8", className)}
      strip={<PanelStrip path={path} />}
    >
      <FrameGrid cols={1} className={decor ? HEADER_GRID : undefined}>
        <FrameCell
          header
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:min-h-[136px] lg:items-center"
        >
          <div className="min-w-0 space-y-2">
            {crumbs && crumbs.length > 0 && (
              <CrumbsNav>
                {crumbs.map((c, i) => (
                  <span key={i} className="flex min-w-0 items-center gap-1.5">
                    {i > 0 && (
                      <ChevronLeftIcon
                        aria-hidden
                        className="size-3.5 shrink-0 opacity-50 ltr:rotate-180"
                      />
                    )}
                    {c.href ? (
                      <Link
                        href={c.href}
                        className="truncate transition-colors hover:text-foreground"
                      >
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current="page" className="truncate text-foreground/80">
                        {c.label}
                      </span>
                    )}
                  </span>
                ))}
              </CrumbsNav>
            )}
            <h1 className={HEADING_CLASS.panel}>{title}</h1>
            {description && (
              <p className="max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </FrameCell>
        {decor && <PanelDecorCell icon={icon} app={app} />}
      </FrameGrid>
      {children}
    </FrameBox>
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
