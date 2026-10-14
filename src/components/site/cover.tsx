import Image from "next/image";
import {
  BookOpenIcon,
  BriefcaseIcon,
  FileTextIcon,
  NotebookPenIcon,
  PlayIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const isLocal = (src: string) => /^\/(media|brand)\//.test(src);

const palette = ["#00A76F", "#078DEE", "#8E33FF", "#FFAB00", "#FF5630", "#00B8D9", "#22C55E"];
const kindIcons: Record<string, LucideIcon> = {
  article: FileTextIcon,
  tutorial: BookOpenIcon,
  vlog: PlayIcon,
  note: NotebookPenIcon,
  work: BriefcaseIcon,
};

/** Deterministic palette pick from a string (fallback covers differ per post). */
function pick(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return palette[h % palette.length]!;
}

/**
 * Cover image with a fixed aspect ratio (no layout shift). Local files
 * (/media, /brand) go through next/image; external URLs use a plain lazy <img>;
 * no cover → a generated, on-brand gradient placeholder.
 */
export function Cover({
  src,
  alt,
  seed,
  kind,
  sizes,
  priority,
  className,
  imgClassName,
  aspect = "aspect-[16/10]",
}: {
  src: string | null | undefined;
  alt: string;
  seed: string;
  kind?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  aspect?: string;
}) {
  const color = pick(seed);
  const Icon = (kind && kindIcons[kind]) || SparklesIcon;
  return (
    <div className={cn("relative overflow-hidden bg-muted", aspect, className)}>
      {src ? (
        isLocal(src) ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            className={cn("object-cover", imgClassName)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- external, un-optimizable URL
          <img
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={cn("absolute inset-0 size-full object-cover", imgClassName)}
          />
        )
      ) : (
        <div
          aria-hidden
          className={cn("absolute inset-0 flex items-center justify-center", imgClassName)}
          style={{
            background: `radial-gradient(90% 80% at 85% 0%, rgb(255 255 255 / .28), transparent 55%), linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 45%, #0b1016))`,
          }}
        >
          <div className="absolute inset-0 [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [background-size:32px_32px] opacity-[0.14]" />
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] ring-1 ring-white/25 backdrop-blur-sm">
            <Icon className="size-7" strokeWidth={1.75} />
          </span>
        </div>
      )}
    </div>
  );
}
