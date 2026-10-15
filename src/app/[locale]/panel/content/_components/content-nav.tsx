import Link from "next/link";
import { LayersIcon, MessageSquareQuoteIcon, NewspaperIcon } from "lucide-react";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";

/** Sub-navigation of the CMS: posts · courses · testimonials. */
export function ContentNav({
  active,
  href,
  t,
}: {
  active: "posts" | "series" | "testimonials";
  href: (p: string) => string;
  t: Messages;
}) {
  const items = [
    { key: "posts", label: t.content.posts, path: "/panel/content", icon: NewspaperIcon },
    {
      key: "series",
      label: t.content.seriesTitle,
      path: "/panel/content/series",
      icon: LayersIcon,
    },
    {
      key: "testimonials",
      label: t.content.testimonialsTitle,
      path: "/panel/content/testimonials",
      icon: MessageSquareQuoteIcon,
    },
  ] as const;
  return (
    <nav
      className="mb-6 flex gap-1 overflow-x-auto border-b border-dashed"
      aria-label={t.nav.content}
    >
      {items.map((it) => (
        <Link
          key={it.key}
          href={href(it.path)}
          aria-current={active === it.key ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
            active === it.key && "border-foreground text-foreground",
          )}
        >
          <it.icon className="size-4" />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
