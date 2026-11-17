import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { brandLogoLayout, toPaths, type PixelTone } from "@/components/brand/pixel-font";
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

/**
 * The GOOD IN / TEAM pixel logo as inline SVG paths with LITERAL dark-mode
 * fills (Satori resolves no CSS variables, so never the React PixelLogo).
 */
const OG_CELL = 10;
const OG_LOGO = brandLogoLayout("TEAM");
const OG_LOGO_PATHS = toPaths(OG_LOGO.cells);
const OG_FILLS: Partial<Record<PixelTone, string>> = {
  accent: "#FFC50D",
  ink: "#A3A4A8",
  corner: "#A3A4A8",
  frame: "#4A4B4F",
  soft: "#5E5F63",
};
const OG_PAPER = "#2A2A2D";

function OgLogo() {
  return (
    <svg
      width={OG_LOGO.width * OG_CELL}
      height={OG_LOGO.height * OG_CELL}
      viewBox={`0 0 ${OG_LOGO.width} ${OG_LOGO.height}`}
      shapeRendering="crispEdges"
    >
      <rect x={1} y={1} width={OG_LOGO.width - 1} height={OG_LOGO.height - 1} fill={OG_PAPER} />
      {(Object.entries(OG_LOGO_PATHS) as [PixelTone, string][]).map(([tone, d]) => (
        <path key={tone} d={d} fill={OG_FILLS[tone]} />
      ))}
    </svg>
  );
}

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
        background: "#161618",
        color: "#FFFFFF",
        fontFamily: family,
        position: "relative",
      }}
    >
      {/* grid + glows */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: ogSize.width,
          height: ogSize.height,
          display: "flex",
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Glow: one full-canvas layer (Satori clips gradients of off-canvas elements; no `inset`). */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: ogSize.width,
          height: ogSize.height,
          display: "flex",
          backgroundImage: `radial-gradient(circle at ${rtl ? "18%" : "82%"} 8%, rgba(255,197,13,0.28) 0%, rgba(255,197,13,0) 40%)`,
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
        <OgLogo />
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>
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
              background: "rgba(255,197,13,0.16)",
              border: "1px solid rgba(255,197,13,0.4)",
              color: "#FFDB66",
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
          color: "#A1A1A6",
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
                    background: "#6A6A6C",
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
            style={{ display: "flex", fontFamily: "PublicSans", fontWeight: 800, color: "#FFDB66" }}
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
          background: "linear-gradient(90deg, #FFC50D, #6A6A6C)",
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
