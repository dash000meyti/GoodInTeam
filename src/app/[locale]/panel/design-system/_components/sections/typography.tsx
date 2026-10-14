import { TypeIcon } from "lucide-react";
import { Markdown } from "@/components/shared/markdown";
import type { Messages } from "@/i18n/messages";
import { Example } from "../example";
import { DsSection } from "../section";

const scale = [
  { cls: "text-4xl font-black", px: "36" },
  { cls: "text-3xl font-extrabold", px: "30" },
  { cls: "text-2xl font-extrabold", px: "24" },
  { cls: "text-xl font-bold", px: "20" },
  { cls: "text-lg font-bold", px: "18" },
  { cls: "text-base", px: "16" },
  { cls: "text-sm", px: "14" },
  { cls: "text-xs", px: "12" },
];
const weights = [400, 500, 600, 700, 800, 900];

export function TypographySection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="typography"
      title={d.sec_typography}
      description={d.sec_typographyDesc}
      icon={TypeIcon}
    >
      <Example
        title={d.typeScale}
        previewClassName="block space-y-3"
        code={`<h1 className="text-2xl font-extrabold tracking-tight">…</h1>   // page titles (PageHeader)
<h2 className="text-xl font-extrabold tracking-tight">…</h2>    // section titles
<CardTitle className="text-lg font-bold">…</CardTitle>
<p className="text-sm text-muted-foreground">…</p>               // descriptions & hints
<span className="text-xs font-bold text-muted-foreground uppercase">…</span> // overlines`}
      >
        {scale.map((s) => (
          <div
            key={s.cls}
            className="flex items-baseline gap-4 border-b border-dashed pb-3 last:border-0"
          >
            <code className="w-44 shrink-0 font-mono text-[11px] text-muted-foreground" dir="ltr">
              {s.cls} · {s.px}px
            </code>
            <span className={`${s.cls} min-w-0 truncate tracking-tight`}>{d.sampleHeading}</span>
          </div>
        ))}
        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
          {weights.map((w) => (
            <span key={w} className="text-lg" style={{ fontWeight: w }}>
              {w} · {t.common.appName}
            </span>
          ))}
        </div>
      </Example>

      <div className="grid gap-5 lg:grid-cols-3">
        <Example
          title={d.fontFa}
          previewClassName="block space-y-2"
          code={`<html lang="fa"> → font-fa (Vazirmatn → Public Sans)`}
        >
          <p lang="fa" dir="rtl" className="font-fa text-2xl font-extrabold">
            {d.sampleFa.split(" ").slice(0, 4).join(" ")}
          </p>
          <p lang="fa" dir="rtl" className="font-fa text-sm leading-7 text-muted-foreground">
            {d.sampleFa} ۰۱۲۳۴۵۶۷۸۹
          </p>
        </Example>
        <Example
          title={d.fontEn}
          previewClassName="block space-y-2"
          code={`<html lang="en"> → font-sans (Public Sans)`}
        >
          <p lang="en" dir="ltr" className="font-sans text-2xl font-extrabold">
            Good Team
          </p>
          <p lang="en" dir="ltr" className="font-sans text-sm leading-7 text-muted-foreground">
            {d.sampleEn} 0123456789
          </p>
        </Example>
        <Example
          title={d.fontMono}
          previewClassName="block space-y-2"
          code={`<code className="font-mono" dir="ltr">…</code>`}
        >
          <p dir="ltr" className="font-mono text-2xl font-bold">
            {"{ }"} =&gt; 42
          </p>
          <p dir="ltr" className="font-mono text-sm text-muted-foreground">
            formatMoney(450_000, &quot;IRT&quot;, &quot;fa&quot;)
          </p>
        </Example>
      </div>

      <Example
        title={d.proseTitle}
        previewClassName="block bg-none"
        code={`import { Markdown } from "@/components/shared/markdown"; // server component
<Markdown source={post.bodyMd} />            // → <div className="prose-gt">…</div>
<Markdown source={trustedHtml} allowHtml />  // raw HTML only for owner-authored public content`}
      >
        <Markdown source={d.proseSample} className="max-w-2xl text-[15px]" />
      </Example>
    </DsSection>
  );
}
