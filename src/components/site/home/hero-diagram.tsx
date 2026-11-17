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
import { PixelLogoCycle } from "@/components/brand/pixel-logo";
import { OsLights } from "@/components/shell/os-lights";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The hero "system diagram" (spec §8 row 01): idea / design / build flow into
 * the Good In hub and out to deploy / client portal / AI agents. Static SVG +
 * HTML in a 600×500 space (the connector layer mirrors in RTL, HTML nodes use
 * logical offsets). No blur and no endless motion: the dashes are static,
 * packets are 3px yellow squares capped at 6 runs (`.gt-packet`, home.css),
 * the orbit rings and the floating cards never move. The hub is a fixed-size
 * chip holding the once-only `PixelLogoCycle` (integer cells: 2, 3 at lg).
 */
const Y = [80, 250, 420] as const;
/** Inputs converge on the hub centre (hidden under the opaque chip at every width). */
const inputPath = (y: number) => `M150 ${y} C 214 ${y}, 206 250, 270 250 H300`;
const outputPath = (y: number) => `M300 250 H330 C 394 250, 386 ${y}, 450 ${y}`;

type Tone = "yellow" | "ink" | "grey";

/** Literal tone map (Tailwind cannot see interpolated names). */
const TONE: Record<Tone, string> = {
  yellow: "bg-primary/18 text-primary-ink",
  ink: "bg-foreground text-background",
  grey: "bg-muted text-muted-foreground",
};

function Node({
  icon: Icon,
  label,
  side,
  y,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  side: "start" | "end";
  y: number;
  tone: Tone;
}) {
  return (
    <div
      className={cn(
        "absolute flex w-[25%] items-center gap-[1.6cqw] rounded-[6px] border border-frame-line bg-card p-[1.4cqw] shadow-card",
        side === "start" ? "start-0" : "end-0",
      )}
      style={{ top: `${((y - 28) / 500) * 100}%`, minHeight: "11.2%" }}
    >
      <span
        className={cn(
          "hidden size-[6.4cqw] shrink-0 items-center justify-center rounded-[3px] @sm:flex",
          TONE[tone],
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
      className="home-diagram @container relative mx-auto aspect-[6/5] w-full max-w-[600px] select-none"
    >
      {/* the one soft light: a radial gradient, no blur */}
      <div aria-hidden className="home-diagram-glow absolute inset-[12%]" />
      <svg
        viewBox="0 0 600 500"
        fill="none"
        aria-hidden
        className="absolute inset-0 size-full overflow-visible rtl:-scale-x-100"
      >
        {/* static orbit rings */}
        <circle
          cx="300"
          cy="250"
          r="96"
          stroke="var(--frame-rail)"
          strokeWidth="1.5"
          strokeDasharray="3 7"
        />
        <circle cx="300" cy="250" r="128" stroke="var(--frame-line)" strokeDasharray="1 9" />
        {[...Y.map(inputPath), ...Y.map(outputPath)].map((d, i) => (
          <g key={d}>
            <path d={d} stroke="var(--frame-rail)" strokeWidth="1.5" className="gt-ants" />
            <path
              d={d}
              pathLength={100}
              stroke="var(--primary)"
              strokeWidth="3"
              className="gt-packet"
              style={{ animationDelay: `${(i < 3 ? i : i - 3 + 1.6) * 0.55}s` }}
            />
            {/* endpoints */}
            <circle
              cx={i < 3 ? 150 : 450}
              cy={Y[i % 3]}
              r="3.5"
              fill="var(--card)"
              stroke="var(--primary-ink)"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </svg>

      {/* inputs */}
      <Node icon={LightbulbIcon} label={s.diagramIdea} side="start" y={Y[0]} tone="yellow" />
      <Node icon={PenToolIcon} label={s.diagramDesign} side="start" y={Y[1]} tone="ink" />
      <Node icon={CodeXmlIcon} label={s.diagramCode} side="start" y={Y[2]} tone="grey" />
      {/* outputs */}
      <Node icon={RocketIcon} label={s.diagramDeploy} side="end" y={Y[0]} tone="yellow" />
      <Node icon={LayoutDashboardIcon} label={s.diagramPortal} side="end" y={Y[1]} tone="ink" />
      <Node icon={BotIcon} label={s.diagramAgents} side="end" y={Y[2]} tone="grey" />

      {/* hub: a fixed-size chip, centred (symmetric, so no logical offsets needed) */}
      <div className="absolute inset-0 m-auto grid h-[56px] w-[88px] place-items-center rounded-[8px] border border-frame-line bg-card shadow-[0_0_0_6px_rgb(var(--primary-rgb)/0.1),var(--shadow-card)] lg:h-[76px] lg:w-[124px]">
        <PixelLogoCycle cell={2} className="lg:[--cell:3px]" />
      </div>

      {/* terminal */}
      <div
        dir="ltr"
        className="absolute overflow-hidden rounded-[6px] border border-[#2c2c30] bg-[#1c1c1e] font-mono text-[clamp(7px,1.8cqw,11px)] leading-relaxed text-[#caccce] shadow-dropdown"
        style={{ insetInlineStart: "31%", top: "-1%", width: "38%" }}
      >
        <div className="flex items-center border-b border-white/10 px-[1.6cqw] py-[1cqw]">
          <OsLights size={10} />
        </div>
        <div className="space-y-[0.3cqw] px-[1.8cqw] py-[1.2cqw]">
          <p>
            <span className="text-[color:var(--primary)]">$</span> git push origin main
          </p>
          <p className="text-[#5be49b]">✓ build passed · 42s</p>
          <p className="text-[#8e8e93]">→ deployed to production</p>
        </div>
      </div>

      {/* progress card */}
      <div
        className="absolute rounded-[6px] border border-frame-line bg-card p-[2cqw] shadow-dropdown"
        style={{ insetInlineStart: "36%", top: "77%", width: "30%" }}
      >
        <div className="flex items-center justify-between gap-2 text-[clamp(8px,1.9cqw,12px)] font-bold">
          <span className="truncate text-muted-foreground">{s.diagramProgress}</span>
          <span className="text-primary-ink">
            {num(72)}
            {locale === "fa" ? "٪" : "%"}
          </span>
        </div>
        <div className="mt-[1.2cqw] h-[1.2cqw] overflow-hidden bg-muted">
          <div className="h-full w-[72%] bg-primary" />
        </div>
        <div className="mt-[1.4cqw] flex items-center gap-[0.8cqw] text-[clamp(7px,1.6cqw,10px)] text-muted-foreground">
          <span className="size-[1.2cqw] bg-success" />
          {s.diagramLive}
        </div>
      </div>

      {/* toast */}
      <div
        className="absolute flex items-center gap-[1cqw] rounded-[6px] border border-frame-line bg-card py-[0.8cqw] ps-[0.8cqw] pe-[2cqw] text-[clamp(8px,1.9cqw,12px)] font-bold shadow-dropdown"
        style={{ insetInlineEnd: "3%", top: "27%" }}
      >
        <span className="flex size-[3.6cqw] items-center justify-center rounded-[3px] bg-success text-success-foreground">
          <CheckIcon className="size-[2.2cqw]" strokeWidth={3} />
        </span>
        {s.diagramTasks}
      </div>
    </div>
  );
}
