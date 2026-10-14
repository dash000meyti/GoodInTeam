import { cn } from "@/lib/utils";

/** Good Team mark: two interlocking rounded shapes ("good" + "team"). Uses the primary color. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn("size-8", className)}>
      <rect x="2" y="2" width="22" height="22" rx="7" fill="var(--primary)" />
      <rect x="16" y="16" width="22" height="22" rx="7" fill="var(--primary-dark)" opacity="0.9" />
      <path d="M16 16h8v8h-1a7 7 0 0 1-7-7v-1Z" fill="var(--primary-light)" />
      <circle cx="13" cy="13" r="3.2" fill="#fff" />
      <circle cx="27" cy="27" r="3.2" fill="#fff" />
    </svg>
  );
}

export function Logo({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight">{label}</span>
    </span>
  );
}
