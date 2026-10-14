import {
  BotIcon,
  CheckIcon,
  CodeXmlIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  PenToolIcon,
  RocketIcon,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { toPersianDigits } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";

/**
 * Animated "system diagram" for the hero (Cloudflare-style): inputs flow into
 * the studio hub and out to deploy / client portal / AI agents. Pure SVG + CSS
 * (dash animations), positioned in a 600×500 coordinate space; HTML nodes use
 * logical offsets and the connector layer mirrors itself in RTL.
 */
const Y = [80, 250, 420] as const;
const inputPath = (y: number) => `M150 ${y} C 198 ${y}, 184 250, 232 250`;
const outputPath = (y: number) => `M368 250 C 416 250, 402 ${y}, 450 ${y}`;

function Node({
  icon: Icon,
  label,
  side,
  y,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  side: "start" | "end";
  y: number;
  tone?: "primary" | "violet" | "info" | "warning";
}) {
  const tones = {
    primary: "bg-primary/12 text-primary",
    violet: "bg-violet/12 text-violet",
    info: "bg-info/12 text-info",
    warning: "bg-warning/16 text-[#b76e00] dark:text-warning",
  } as const;
  return (
    <div
      className={cn(
        "absolute flex w-[25%] items-center gap-[1.6cqw] rounded-[2.4cqw] border border-border bg-card/90 p-[1.4cqw] shadow-card backdrop-blur-md",
        side === "start" ? "start-0" : "end-0",
      )}
      style={{ top: `${((y - 28) / 500) * 100}%`, minHeight: "11.2%" }}
    >
      <span
        className={cn(
          "hidden size-[6.4cqw] shrink-0 items-center justify-center rounded-[1.6cqw] @sm:flex",
          tones[tone],
        )}
      >
        <Icon className="size-[3.4cqw]" />
      </span>
      <span className="min-w-0 text-[clamp(10px,2.5cqw,15px)] leading-tight font-bold">
        {label}
      </span>
    </div>
  );
}

export function HeroDiagram({ t, locale }: { t: Messages; locale: Locale }) {
  const s = t.site;
  const num = (n: number | string) => (locale === "fa" ? toPersianDigits(n) : String(n));
  return (
    <div
      role="img"
      aria-label={s.diagramLabel}
      className="@container relative mx-auto aspect-[6/5] w-full max-w-[600px] select-none"
    >
      {/* glow + grid behind the hub */}
      <div
        aria-hidden
        className="absolute inset-[18%] rounded-full bg-primary/25 blur-3xl dark:bg-primary/20"
      />
      <svg
        viewBox="0 0 600 500"
        fill="none"
        aria-hidden
        className="absolute inset-0 size-full overflow-visible rtl:-scale-x-100"
      >
        <defs>
          <linearGradient id="gt-line" x1="0" x2="600" y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--primary)" stopOpacity="0.15" />
            <stop offset="0.5" stopColor="var(--primary)" stopOpacity="0.7" />
            <stop offset="1" stopColor="#8e33ff" stopOpacity="0.35" />
          </linearGradient>
          <filter id="gt-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* hub orbit */}
        <circle
          cx="300"
          cy="250"
          r="96"
          stroke="var(--border)"
          strokeWidth="1.5"
          strokeDasharray="3 7"
          className="origin-[300px_250px] animate-[spin_40s_linear_infinite]"
        />
        <circle
          cx="300"
          cy="250"
          r="128"
          stroke="var(--border)"
          strokeOpacity="0.6"
          strokeDasharray="1 9"
        />
        {[...Y.map(inputPath), ...Y.map(outputPath)].map((d, i) => (
          <g key={d}>
            <path d={d} stroke="url(#gt-line)" strokeWidth="1.5" className="gt-ants" />
            <path
              d={d}
              pathLength={100}
              stroke={i < 3 ? "var(--primary)" : "#8e33ff"}
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#gt-glow)"
              className="gt-packet"
              style={{ animationDelay: `${(i < 3 ? i : i - 3 + 1.6) * 0.55}s` }}
            />
            {/* endpoints */}
            <circle
              cx={i < 3 ? 150 : 450}
              cy={Y[i % 3]}
              r="3.5"
              fill="var(--background)"
              stroke="var(--primary)"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </svg>

      {/* inputs */}
      <Node icon={LightbulbIcon} label={s.diagramIdea} side="start" y={Y[0]} tone="warning" />
      <Node icon={PenToolIcon} label={s.diagramDesign} side="start" y={Y[1]} tone="violet" />
      <Node icon={CodeXmlIcon} label={s.diagramCode} side="start" y={Y[2]} tone="info" />
      {/* outputs */}
      <Node icon={RocketIcon} label={s.diagramDeploy} side="end" y={Y[0]} />
      <Node icon={LayoutDashboardIcon} label={s.diagramPortal} side="end" y={Y[1]} />
      <Node icon={BotIcon} label={s.diagramAgents} side="end" y={Y[2]} tone="violet" />

      {/* hub */}
      <div
        className="absolute flex flex-col items-center justify-center gap-[1.2cqw] rounded-[5cqw] border border-primary/30 bg-card shadow-[0_0_0_6px_rgb(var(--primary-rgb)/0.06),0_20px_60px_-12px_rgb(var(--primary-rgb)/0.45)]"
        style={{ insetInlineStart: "38.667%", top: "36.4%", width: "22.667%", height: "27.2%" }}
      >
        <LogoMark className="size-[9cqw]" />
        <span className="text-[clamp(9px,2.3cqw,14px)] font-black tracking-tight">
          {t.common.appName}
        </span>
      </div>

      {/* floating: terminal */}
      <div
        dir="ltr"
        className="absolute animate-float overflow-hidden rounded-[2cqw] border border-white/10 bg-grey-900/95 font-mono text-[clamp(7px,1.8cqw,11px)] leading-relaxed text-grey-300 shadow-dialog"
        style={{ insetInlineStart: "31%", top: "-1%", width: "38%" }}
      >
        <div className="flex items-center gap-[0.8cqw] border-b border-white/10 px-[1.6cqw] py-[1cqw]">
          <span className="size-[1.2cqw] rounded-full bg-[#ff5f57]" />
          <span className="size-[1.2cqw] rounded-full bg-[#febc2e]" />
          <span className="size-[1.2cqw] rounded-full bg-[#28c840]" />
        </div>
        <div className="space-y-[0.3cqw] px-[1.8cqw] py-[1.2cqw]">
          <p>
            <span className="text-primary-light">$</span> git push origin main
          </p>
          <p className="text-[#5be49b]">✓ build passed · 42s</p>
          <p className="text-grey-500">→ deployed to production</p>
        </div>
      </div>

      {/* floating: progress card */}
      <div
        className="absolute animate-float rounded-[2.4cqw] border border-border bg-card/95 p-[2cqw] shadow-dropdown backdrop-blur-md [animation-delay:-3s]"
        style={{ insetInlineStart: "36%", top: "77%", width: "30%" }}
      >
        <div className="flex items-center justify-between gap-2 text-[clamp(8px,1.9cqw,12px)] font-bold">
          <span className="truncate text-muted-foreground">{s.diagramProgress}</span>
          <span className="text-primary">
            {num(72)}
            {locale === "fa" ? "٪" : "%"}
          </span>
        </div>
        <div className="mt-[1.2cqw] h-[1.2cqw] overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[72%] rounded-full bg-gradient-to-l from-primary to-primary-light rtl:bg-gradient-to-r" />
        </div>
        <div className="mt-[1.4cqw] flex items-center gap-[0.8cqw] text-[clamp(7px,1.6cqw,10px)] text-muted-foreground">
          <span className="gt-live size-[1.2cqw] rounded-full bg-success" />
          {s.diagramLive}
        </div>
      </div>

      {/* floating: toast */}
      <div
        className="absolute flex animate-float items-center gap-[1cqw] rounded-full border border-border bg-card/95 py-[0.8cqw] ps-[0.8cqw] pe-[2cqw] text-[clamp(8px,1.9cqw,12px)] font-bold shadow-dropdown backdrop-blur [animation-delay:-1.5s]"
        style={{ insetInlineEnd: "3%", top: "27%" }}
      >
        <span className="flex size-[3.6cqw] items-center justify-center rounded-full bg-success text-white">
          <CheckIcon className="size-[2.2cqw]" strokeWidth={3} />
        </span>
        {s.diagramTasks}
      </div>
    </div>
  );
}
