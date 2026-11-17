import "server-only";
import type { ReactNode } from "react";
import {
  CheckIcon,
  CircleCheckIcon,
  FileSignatureIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  type LucideIcon,
} from "lucide-react";
import { Window } from "@/components/shell/window";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FrameCell, FrameGrid, FrameHeaderCell, FrameSection, framePath } from "../frame";

/**
 * 05 · process (spec §8 row 06): tabbed showcase with ZERO JavaScript. Radio
 * inputs + `:has()` drive the active tab, the panel inside the ONE window and
 * the window's pixel path (a single `PixelTextSet`; home.css swaps the
 * visible `[data-path-id]`). Keyboard: arrow keys switch tabs.
 * Row 1 (`FrameGrid 1`): the centred header. Row 2 (a stacked `FrameGrid 2-1`):
 * the window on dots (2fr) and the tab column (1fr, a chip grid above the
 * window below 1024px).
 */
type TabKey = "portal" | "progress" | "contracts" | "invoices";

const tabs: { key: TabKey; icon: LucideIcon }[] = [
  { key: "portal", icon: LayoutDashboardIcon },
  { key: "progress", icon: GaugeIcon },
  { key: "contracts", icon: FileSignatureIcon },
  { key: "invoices", icon: ReceiptIcon },
];

/** The window path per tab (Latin pixel data); PORTAL is first and shows by default. */
const PATHS = [
  { id: "PORTAL", text: "PORTAL" },
  { id: "PROGRESS", text: "PROGRESS" },
  { id: "CONTRACTS", text: "CONTRACTS" },
  { id: "INVOICES", text: "INVOICES" },
] as const;

/** Literal class names per tab (Tailwind can't see interpolated class strings). */
const tabCls: Record<TabKey, { label: string; icon: string; panel: string }> = {
  portal: {
    label:
      "group-has-[#how-portal:focus-visible]:ring-2 group-has-[#how-portal:focus-visible]:ring-ring",
    icon: "group-has-[#how-portal:checked]:bg-primary group-has-[#how-portal:checked]:text-primary-foreground",
    panel: "group-has-[#how-portal:checked]:grid",
  },
  progress: {
    label:
      "group-has-[#how-progress:focus-visible]:ring-2 group-has-[#how-progress:focus-visible]:ring-ring",
    icon: "group-has-[#how-progress:checked]:bg-primary group-has-[#how-progress:checked]:text-primary-foreground",
    panel: "group-has-[#how-progress:checked]:grid",
  },
  contracts: {
    label:
      "group-has-[#how-contracts:focus-visible]:ring-2 group-has-[#how-contracts:focus-visible]:ring-ring",
    icon: "group-has-[#how-contracts:checked]:bg-primary group-has-[#how-contracts:checked]:text-primary-foreground",
    panel: "group-has-[#how-contracts:checked]:grid",
  },
  invoices: {
    label:
      "group-has-[#how-invoices:focus-visible]:ring-2 group-has-[#how-invoices:focus-visible]:ring-ring",
    icon: "group-has-[#how-invoices:checked]:bg-primary group-has-[#how-invoices:checked]:text-primary-foreground",
    panel: "group-has-[#how-invoices:checked]:grid",
  },
};

/** Intrinsic height of the process body for `content-visibility` (spec §8: 680). */
const PROCESS_CIS = 680;

const cap = (k: TabKey) => (k[0]!.toUpperCase() + k.slice(1)) as Capitalize<TabKey>;

/** A mock's surface inside the window (the window itself is the frame). */
function Mock({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-[8px] border border-frame-line bg-background p-4 sm:p-5">
      {children}
    </div>
  );
}

function PortalMock({ t, n }: { t: Messages; n: (v: number | string) => string }) {
  const s = t.site;
  const ms = [
    { label: s.mockMilestone1, state: "done" },
    { label: s.mockMilestone2, state: "doing" },
    { label: s.mockMilestone3, state: "todo" },
  ] as const;
  return (
    <Mock>
      <div className="flex items-center gap-4">
        <div
          className="relative grid size-20 shrink-0 place-items-center rounded-full"
          style={{ background: "conic-gradient(var(--primary) 0 72%, var(--muted) 72% 100%)" }}
        >
          <div className="grid size-15 place-items-center rounded-full bg-background text-lg font-black">
            <span className="whitespace-nowrap">
              {n(72)}
              <span className="text-xs">%</span>
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{s.diagramProgress}</p>
          <p className="truncate text-base font-extrabold">{s.mockProject}</p>
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-success-ink">
            <span className="gt-live size-2 bg-success" /> {s.diagramLive}
          </span>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {ms.map((m) => (
          <li
            key={m.label}
            className="flex items-center gap-3 rounded-[6px] bg-muted/70 px-3 py-2.5 text-sm"
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full",
                m.state === "done" && "bg-success text-success-foreground",
                m.state === "doing" && "border-2 border-primary-ink",
                m.state === "todo" && "border-2 border-grey-400",
              )}
            >
              {m.state === "done" && <CheckIcon className="size-3" strokeWidth={3} />}
            </span>
            <span className={cn("font-semibold", m.state === "todo" && "text-muted-foreground")}>
              {m.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-start gap-3 rounded-[6px] border border-dashed border-frame-line p-3">
        <span className="mt-1 size-2 shrink-0 bg-primary shadow-[0_0_0_1px_var(--brand-ink)]" />
        <p className="text-xs leading-6 text-muted-foreground">
          <span className="font-bold text-foreground">{s.mockUpdate}</span> · {n(2)}h
        </p>
      </div>
    </Mock>
  );
}

function ProgressMock({ t, n }: { t: Messages; n: (v: number | string) => string }) {
  const bars = [62, 80, 45, 92, 70, 30, 54];
  return (
    <Mock>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{t.site.mockHoursWeek}</p>
          <p className="mt-1 text-3xl font-black tracking-tight">{n("32.5")}</p>
        </div>
        <span className="bg-success/16 px-2 py-0.5 text-xs font-bold text-success-ink">
          +{n(12)}%
        </span>
      </div>
      <div className="mt-6 flex h-36 items-end gap-2.5" dir="ltr">
        {bars.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={cn("w-full", i === 3 ? "bg-primary" : "bg-primary/30")}
              style={{ height: `${h}%` }}
            />
            <span className="size-1 bg-grey-400" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        {[t.site.mockMilestone1, t.site.mockMilestone2, t.site.mockMilestone3].map((m, i) => (
          <div key={m} className="rounded-[6px] bg-muted/70 px-2 py-2">
            <p className="truncate font-semibold text-muted-foreground">{m}</p>
            <p className="mt-0.5 font-black">{n([100, 64, 10][i]!)}%</p>
          </div>
        ))}
      </div>
    </Mock>
  );
}

function ContractMock({ t }: { t: Messages }) {
  return (
    <Mock>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[6px] bg-primary/18 text-primary-ink">
            <FileSignatureIcon className="size-5" />
          </span>
          <p className="text-sm font-extrabold">{t.site.mockContract}</p>
        </div>
        <span className="inline-flex items-center gap-1 bg-success/16 px-2.5 py-1 text-xs font-bold text-success-ink">
          <CircleCheckIcon className="size-3.5" /> {t.site.mockSigned}
        </span>
      </div>
      <div className="mt-5 space-y-2.5">
        {[100, 92, 96, 70, 88, 60].map((w, i) => (
          <div key={i} className="h-2 bg-muted" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-frame-line pt-4">
        <svg viewBox="0 0 160 50" className="h-12 w-40 text-foreground" fill="none" aria-hidden>
          <path
            d="M4 38c14-22 22-30 30-24s-6 26 6 22 14-28 24-26 2 22 12 22 12-16 20-16 6 12 14 12 16-10 22-12 14 4 22 2"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            pathLength={100}
            className="gt-draw"
          />
        </svg>
        <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
          sha256: 9f2c…a71e
        </span>
      </div>
    </Mock>
  );
}

function InvoiceMock({ t, n }: { t: Messages; n: (v: number | string) => string }) {
  const rows = [
    { label: t.site.mockMilestone1, v: "18" },
    { label: t.site.mockMilestone2, v: "26.5" },
    { label: t.site.mockMilestone3, v: "9" },
  ];
  return (
    <Mock>
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold">{t.site.mockInvoice}</p>
        <span className="bg-success/16 px-2.5 py-1 text-xs font-bold text-success-ink">
          {t.site.mockPaid}
        </span>
      </div>
      <ul className="mt-5 divide-y divide-dashed divide-frame-line text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-mono font-semibold tabular-nums">{n(r.v)}h</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between bg-primary/14 px-4 py-3">
        <span className="text-sm font-bold">{t.common.total}</span>
        <span className="text-lg font-black text-primary-ink tabular-nums">{n("53.5")}h</span>
      </div>
    </Mock>
  );
}

export function HowWeWork({ t, locale }: { t: Messages; locale: Locale }) {
  const s = t.site;
  const n = (v: number | string) => (locale === "fa" ? toPersianDigits(v) : String(v));
  const mocks: Record<TabKey, ReactNode> = {
    portal: <PortalMock t={t} n={n} />,
    progress: <ProgressMock t={t} n={n} />,
    contracts: <ContractMock t={t} />,
    invoices: <InvoiceMock t={t} n={n} />,
  };
  return (
    <FrameSection
      id="process"
      labelledBy="process-title"
      guide={{ key: "home_process", say: t.guide.home_process }}
      strip={{ index: 5, path: framePath("good-in-team", "process") }}
      cv={PROCESS_CIS}
      className="home-process group"
    >
      <FrameGrid cols={1} reveal>
        <FrameHeaderCell
          span="full"
          eyebrow={s.processEyebrow}
          title={s.processTitle}
          titleId="process-title"
          subtitle={s.processSubtitle}
          className="items-center text-center [&>.frame-eyebrow]:self-center"
        />
      </FrameGrid>
      <FrameGrid cols="2-1" reveal>
        {/* tabs: first in the DOM (a chip grid above the window below lg), the end column at lg */}
        <FrameCell pad="none" className="lg:col-start-2 lg:row-start-1">
          <fieldset className="contents">
            <legend className="sr-only">{s.processTitle}</legend>
            {tabs.map((tab, i) => (
              <input
                key={tab.key}
                type="radio"
                name="how-we-work"
                id={`how-${tab.key}`}
                defaultChecked={i === 0}
                className="sr-only"
              />
            ))}
            <FrameGrid cols={1} className="h-full grid-cols-2 lg:grid-cols-1">
              {tabs.map(({ key, icon: Icon }) => {
                const k = cap(key);
                return (
                  <FrameCell
                    key={key}
                    pad="none"
                    spot={{ key: `process-${key}`, say: t.guide[`home_process_${key}`] }}
                    data-tab={key}
                    className="home-tab"
                  >
                    <label
                      htmlFor={`how-${key}`}
                      className={cn(
                        "flex h-full cursor-pointer items-start gap-3 p-4 ring-inset md:items-center lg:p-6",
                        tabCls[key].label,
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center bg-muted text-muted-foreground transition-colors lg:size-11",
                          tabCls[key].icon,
                        )}
                      >
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="home-tab-name block text-[15px] font-semibold">
                          {s[`tab${k}`]}
                        </span>
                        <span className="mt-1 hidden text-sm leading-6 text-muted-foreground lg:block">
                          {s[`tab${k}Title`]}
                        </span>
                      </span>
                    </label>
                  </FrameCell>
                );
              })}
            </FrameGrid>
          </fieldset>
        </FrameCell>
        {/* the ONE window: its path follows the checked tab (home.css) */}
        <FrameCell tone="dots" className="lg:col-start-1 lg:row-start-1">
          <Window path={PATHS} className="h-full">
            {tabs.map(({ key }) => {
              const k = cap(key);
              return (
                <div
                  key={key}
                  className={cn(
                    "gt-rise hidden min-h-[400px] grid-cols-[minmax(0,1fr)] gap-8 p-5 sm:p-6 md:grid-cols-2 md:items-center",
                    tabCls[key].panel,
                  )}
                >
                  <div className="space-y-4">
                    <h3 className="text-2xl leading-snug font-extrabold text-balance [:lang(en)_&]:tracking-tight">
                      {s[`tab${k}Title`]}
                    </h3>
                    <p className="leading-7 text-muted-foreground [:lang(fa)_&]:leading-8">
                      {s[`tab${k}Body`]}
                    </p>
                    <ul className="space-y-2.5">
                      {[1, 2, 3].map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-sm font-semibold">
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center bg-primary/18 text-primary-ink">
                            <CheckIcon aria-hidden className="size-3" strokeWidth={3} />
                          </span>
                          {s[`tab${k}Point${p as 1 | 2 | 3}`]}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {mocks[key]}
                </div>
              );
            })}
          </Window>
        </FrameCell>
      </FrameGrid>
    </FrameSection>
  );
}
