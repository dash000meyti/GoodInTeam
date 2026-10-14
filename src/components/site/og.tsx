import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { Locale } from "@/i18n/config";
import { bidiRuns, hasRtl, visualRtl } from "@/lib/arabic-shaping";

/**
 * Open Graph image renderer (1200×630) shared by the site, blog posts and case
 * studies. Satori can't shape Arabic script or lay out RTL text, so Persian
 * text is pre-shaped (presentation forms, visual order) and laid out word-run
 * by word-run with `row-reverse` (see src/lib/arabic-shaping.ts).
 * Fonts: static TTF instances in public/fonts/og (Vazirmatn incl. Latin,
 * Public Sans) — Satori doesn't read woff2.
 */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const fontDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "fonts", "og");
let fonts: { name: string; data: Buffer; weight: 500 | 800; style: "normal" }[] | null = null;
function loadFonts() {
  if (!fonts) {
    const f = (file: string) => readFileSync(path.join(fontDir, file));
    fonts = [
      { name: "Vazirmatn", data: f("vazirmatn-800.ttf"), weight: 800, style: "normal" },
      { name: "Vazirmatn", data: f("vazirmatn-500.ttf"), weight: 500, style: "normal" },
      { name: "PublicSans", data: f("public-sans-800.ttf"), weight: 800, style: "normal" },
      { name: "PublicSans", data: f("public-sans-500.ttf"), weight: 500, style: "normal" },
    ];
  }
  return fonts;
}

/** Text that renders correctly in both directions (inline-flex of word runs). */
function Text({ text, rtl, gap }: { text: string; rtl: boolean; gap: number }) {
  if (!rtl && !hasRtl(text)) return <span>{text}</span>;
  const runs = bidiRuns(text);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        flexDirection: rtl ? "row-reverse" : "row",
        columnGap: gap,
      }}
    >
      {runs.map((r, i) => (
        <span key={i}>{r.rtl ? visualRtl(r.text) : r.text}</span>
      ))}
    </div>
  );
}

export interface OgInput {
  locale: Locale;
  title: string;
  eyebrow?: string;
  brand: string;
  footer?: string[];
  domain?: string;
}

export function renderOgImage({ locale, title, eyebrow, brand, footer = [], domain }: OgInput) {
  const rtl = locale === "fa";
  const family = rtl ? "Vazirmatn" : "PublicSans";
  const len = title.length;
  const size = len > 80 ? 46 : len > 55 ? 54 : len > 32 ? 62 : 72;
  const align = rtl ? "flex-end" : "flex-start";
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "#141A21",
        color: "#FFFFFF",
        fontFamily: family,
        position: "relative",
      }}
    >
      {/* grid + glows */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundImage:
            "linear-gradient(to right, rgba(145,158,171,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(145,158,171,0.10) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -260,
          [rtl ? "left" : "right"]: -160,
          width: 760,
          height: 760,
          display: "flex",
          borderRadius: 9999,
          background:
            "radial-gradient(circle closest-side, rgba(0,167,111,0.5), rgba(0,167,111,0) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -320,
          [rtl ? "right" : "left"]: -200,
          width: 720,
          height: 720,
          display: "flex",
          borderRadius: 9999,
          background:
            "radial-gradient(circle closest-side, rgba(142,51,255,0.32), rgba(142,51,255,0) 100%)",
        }}
      />

      {/* header */}
      <div
        style={{
          display: "flex",
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 18,
        }}
      >
        <svg width="56" height="56" viewBox="0 0 40 40">
          <rect x="2" y="2" width="22" height="22" rx="7" fill="#00A76F" />
          <rect x="16" y="16" width="22" height="22" rx="7" fill="#007867" opacity="0.9" />
          <path d="M16 16h8v8h-1a7 7 0 0 1-7-7v-1Z" fill="#5BE49B" />
          <circle cx="13" cy="13" r="3.2" fill="#fff" />
          <circle cx="27" cy="27" r="3.2" fill="#fff" />
        </svg>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>
          <Text text={brand} rtl={rtl} gap={10} />
        </div>
        {eyebrow && (
          <div
            style={{
              display: "flex",
              marginLeft: rtl ? 0 : "auto",
              marginRight: rtl ? "auto" : 0,
              padding: "10px 22px",
              borderRadius: 9999,
              background: "rgba(0,167,111,0.18)",
              border: "1px solid rgba(91,228,155,0.35)",
              color: "#5BE49B",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            <Text text={eyebrow} rtl={rtl} gap={8} />
          </div>
        )}
      </div>

      {/* title */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: align,
          fontSize: size,
          fontWeight: 800,
          lineHeight: 1.35,
          letterSpacing: rtl ? 0 : -1.5,
          maxWidth: 1056,
          textAlign: rtl ? "right" : "left",
        }}
      >
        <Text text={title} rtl={rtl} gap={Math.round(size * 0.28)} />
      </div>

      {/* footer */}
      <div
        style={{
          display: "flex",
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 24,
          fontWeight: 500,
          color: "#C4CDD5",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: rtl ? "row-reverse" : "row",
            gap: 16,
            alignItems: "center",
          }}
        >
          {footer.filter(Boolean).map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: rtl ? "row-reverse" : "row",
                alignItems: "center",
                gap: 16,
              }}
            >
              {i > 0 && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 9999,
                    background: "#637381",
                    display: "flex",
                  }}
                />
              )}
              <Text text={f} rtl={rtl} gap={7} />
            </div>
          ))}
        </div>
        {domain && (
          <div
            style={{ display: "flex", fontFamily: "PublicSans", fontWeight: 800, color: "#5BE49B" }}
          >
            {domain}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 8,
          display: "flex",
          background: "linear-gradient(90deg, #00A76F, #5BE49B, #8E33FF)",
        }}
      />
    </div>,
    {
      ...ogSize,
      fonts: loadFonts(),
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

export const ogDomain = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
