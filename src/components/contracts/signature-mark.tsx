import { BadgeCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual of one signature: the drawn PNG on a light "paper" chip (dark ink
 * stays readable in dark mode and in print), else the typed signature, else an
 * approval stamp (acknowledgement without signature).
 */
export function SignatureMark({
  image,
  typedName,
  alt,
  approvedLabel,
  className,
}: {
  image?: string | null;
  typedName?: string | null;
  alt: string;
  approvedLabel?: string;
  className?: string;
}) {
  if (image) {
    return (
      <span
        className={cn(
          "inline-flex h-20 max-w-full items-center rounded-lg bg-white px-3 ring-1 ring-grey-300/60",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- inline data URL */}
        <img src={image} alt={alt} className="max-h-16 w-auto max-w-full object-contain" />
      </span>
    );
  }
  if (typedName) {
    return (
      <span
        className={cn(
          "inline-flex min-h-14 items-center rounded-lg bg-white px-4 font-serif text-2xl text-grey-800 italic ring-1 ring-grey-300/60",
          className,
        )}
      >
        {typedName}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border-2 border-success/60 px-3 py-1.5 text-sm font-extrabold text-[#118d57] dark:text-[#77ed8b]",
        className,
      )}
    >
      <BadgeCheckIcon className="size-4" />
      {approvedLabel}
    </span>
  );
}
