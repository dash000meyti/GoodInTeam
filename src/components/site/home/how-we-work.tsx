import {
  CheckIcon,
  CircleCheckIcon,
  FileSignatureIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Tabbed feature showcase (korsi-style) with ZERO JavaScript: radio inputs +
 * `:has()` drive the active tab and panel. Keyboard: arrow keys switch tabs.
 */
type TabKey = "portal" | "progress" | "contracts" | "invoices";

const tabs: { key: TabKey; icon: LucideIcon }[] = [
  { key: "portal", icon: LayoutDashboardIcon },
  { key: "progress", icon: GaugeIcon },
  { key: "contracts", icon: FileSignatureIcon },
  { key: "invoices", icon: ReceiptIcon },
];

/** Literal class names per tab (Tailwind can't see interpolated class strings). */
const tabCls: Record<TabKey, { label: string; icon: string; panel: string }> = {
  portal: {
    label:
      "group-has-[#how-portal:checked]:border-border group-has-[#how-portal:checked]:bg-card group-has-[#how-portal:checked]:shadow-card group-has-[#how-portal:focus-visible]:ring-[3px] group-has-[#how-portal:focus-visible]:ring-ring/40",
    icon: "group-has-[#how-portal:checked]:bg-primary group-has-[#how-portal:checked]:text-primary-foreground",
    panel: "group-has-[#how-portal:checked]:grid",
  },
  progress: {
    label:
      "group-has-[#how-progress:checked]:border-border group-has-[#how-progress:checked]:bg-card group-has-[#how-progress:checked]:shadow-card group-has-[#how-progress:focus-visible]:ring-[3px] group-has-[#how-progress:focus-visible]:ring-ring/40",
    icon: "group-has-[#how-progress:checked]:bg-primary group-has-[#how-progress:checked]:text-primary-foreground",
    panel: "group-has-[#how-progress:checked]:grid",
  },
  contracts: {
    label:
      "group-has-[#how-contracts:checked]:border-border group-has-[#how-contracts:checked]:bg-card group-has-[#how-contracts:checked]:shadow-card group-has-[#how-contracts:focus-visible]:ring-[3px] group-has-[#how-contracts:focus-visible]:ring-ring/40",
    icon: "group-has-[#how-contracts:checked]:bg-primary group-has-[#how-contracts:checked]:text-primary-foreground",
    panel: "group-has-[#how-contracts:checked]:grid",
  },
  invoices: {
    label:
      "group-has-[#how-invoices:checked]:border-border group-has-[#how-invoices:checked]:bg-card group-has-[#how-invoices:checked]:shadow-card group-has-[#how-invoices:focus-visible]:ring-[3px] group-has-[#how-invoices:focus-visible]:ring-ring/40",
    icon: "group-has-[#how-invoices:checked]:bg-primary group-has-[#how-invoices:checked]:text-primary-foreground",
    panel: "group-has-[#how-invoices:checked]:grid",
  },
};

const cap = (k: TabKey) => (k[0]!.toUpperCase() + k.slice(1)) as Capitalize<TabKey>;

function MockFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-dropdown",
        className,
      )}
    >
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
    <MockFrame>
      <div className="flex items-center gap-4">
        <div
          className="relative grid size-20 shrink-0 place-items-center rounded-full"
          style={{ background: "conic-gradient(var(--primary) 0 72%, var(--muted) 72% 100%)" }}
        >
          <div className="grid size-15 place-items-center rounded-full bg-card text-lg font-black">
            <span className="whitespace-nowrap">
              {n(72)}
              <span className="text-xs">%</span>
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{s.diagramProgress}</p>
          <p className="truncate text-base font-extrabold">{s.mockProject}</p>
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-success">
            <span className="gt-live size-2 rounded-full bg-success" /> {s.diagramLive}
          </span>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {ms.map((m) => (
          <li
            key={m.label}
            className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm"
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full",
                m.state === "done" && "bg-success text-white",
                m.state === "doing" && "border-2 border-primary",
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
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed p-3">
        <span className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" />
        <p className="text-xs leading-6 text-muted-foreground">
          <span className="font-bold text-foreground">{s.mockUpdate}</span> · {n(2)}h
        </p>
      </div>
    </MockFrame>
  );
}

function ProgressMock({ t, n }: { t: Messages; n: (v: number | string) => string }) {
  const bars = [62, 80, 45, 92, 70, 30, 54];
  return (
    <MockFrame>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{t.site.mockHoursWeek}</p>
          <p className="mt-1 text-3xl font-black tracking-tight">{n("32.5")}</p>
        </div>
        <span className="rounded-full bg-success/16 px-2 py-0.5 text-xs font-bold text-[#118d57] dark:text-[#77ed8b]">
          +{n(12)}%
        </span>
      </div>
      <div className="mt-6 flex h-36 items-end gap-2.5" dir="ltr">
        {bars.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={cn("w-full rounded-t-lg", i === 3 ? "bg-primary" : "bg-primary/25")}
              style={{ height: `${h}%` }}
            />
            <span className="size-1 rounded-full bg-grey-400" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        {[t.site.mockMilestone1, t.site.mockMilestone2, t.site.mockMilestone3].map((m, i) => (
          <div key={m} className="rounded-lg bg-muted/60 px-2 py-2">
            <p className="truncate font-semibold text-muted-foreground">{m}</p>
            <p className="mt-0.5 font-black">{n([100, 64, 10][i]!)}%</p>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

function ContractMock({ t }: { t: Messages }) {
  return (
    <MockFrame>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-violet/12 text-violet">
            <FileSignatureIcon className="size-5" />
          </span>
          <p className="text-sm font-extrabold">{t.site.mockContract}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-success/16 px-2.5 py-1 text-xs font-bold text-[#118d57] dark:text-[#77ed8b]">
          <CircleCheckIcon className="size-3.5" /> {t.site.mockSigned}
        </span>
      </div>
      <div className="mt-5 space-y-2.5">
        {[100, 92, 96, 70, 88, 60].map((w, i) => (
          <div key={i} className="h-2 rounded-full bg-muted" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-6 flex items-end justify-between gap-4 border-t border-dashed pt-4">
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
    </MockFrame>
  );
}

function InvoiceMock({ t, n }: { t: Messages; n: (v: number | string) => string }) {
  const rows = [
    { label: t.site.mockMilestone1, v: "18" },
    { label: t.site.mockMilestone2, v: "26.5" },
    { label: t.site.mockMilestone3, v: "9" },
  ];
  return (
    <MockFrame>
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold">{t.site.mockInvoice}</p>
        <span className="rounded-full bg-success/16 px-2.5 py-1 text-xs font-bold text-[#118d57] dark:text-[#77ed8b]">
          {t.site.mockPaid}
        </span>
      </div>
      <ul className="mt-5 divide-y divide-dashed divide-border text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-mono font-semibold tabular-nums">{n(r.v)}h</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/8 px-4 py-3">
        <span className="text-sm font-bold">{t.common.total}</span>
        <span className="text-lg font-black text-primary tabular-nums">{n("53.5")}h</span>
      </div>
    </MockFrame>
  );
}

export function HowWeWork({ t, locale }: { t: Messages; locale: Locale }) {
  const s = t.site;
  const n = (v: number | string) => (locale === "fa" ? toPersianDigits(v) : String(v));
  const mocks: Record<TabKey, React.ReactNode> = {
    portal: <PortalMock t={t} n={n} />,
    progress: <ProgressMock t={t} n={n} />,
    contracts: <ContractMock t={t} />,
    invoices: <InvoiceMock t={t} n={n} />,
  };
  return (
    <div className="group grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
      <fieldset className="contents">
        <legend className="sr-only">{s.processTitle}</legend>
        {tabs.map((tab, i) => (
          <input
            key={tab.key}
            type="radio"
            name="how-we-work"
            id={`how-${tab.key}`}
            defaultChecked={i === 0}
            className="peer sr-only"
          />
        ))}
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {tabs.map(({ key, icon: Icon }) => {
            const k = cap(key);
            return (
              <label
                key={key}
                htmlFor={`how-${key}`}
                className={cn(
                  "flex min-w-56 cursor-pointer gap-4 rounded-2xl border border-transparent p-4 transition-all hover:bg-muted/60 lg:min-w-0",
                  tabCls[key].label,
                )}
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors",
                    tabCls[key].icon,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-extrabold">{s[`tab${k}`]}</span>
                  <span className="mt-1 hidden text-sm leading-6 text-muted-foreground lg:block">
                    {s[`tab${k}Title`]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="relative overflow-hidden rounded-3xl border border-border bg-muted/40 p-6 sm:p-8">
        <div aria-hidden className="bg-dots absolute inset-0 opacity-70" />
        <div aria-hidden className="gt-glow -end-20 -top-20 size-72 bg-primary/20" />
        {tabs.map(({ key }) => {
          const k = cap(key);
          return (
            <div
              key={key}
              className={cn(
                "gt-rise relative hidden gap-8 sm:grid-cols-2 sm:items-center",
                tabCls[key].panel,
              )}
            >
              <div className="space-y-4">
                <h3 className="text-2xl leading-snug font-black tracking-tight text-balance">
                  {s[`tab${k}Title`]}
                </h3>
                <p className="leading-8 text-muted-foreground">{s[`tab${k}Body`]}</p>
                <ul className="space-y-2.5">
                  {[1, 2, 3].map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm font-semibold">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <CheckIcon className="size-3" strokeWidth={3} />
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
      </div>
    </div>
  );
}
