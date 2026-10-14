import localFont from "next/font/local";

// Self-hosted (no build-time network access needed). Persian glyphs come from
// Vazirmatn, Latin glyphs from Public Sans, code from JetBrains Mono.
export const vazirmatn = localFont({
  src: "../../node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Tahoma", "system-ui", "sans-serif"],
});

export const publicSans = localFont({
  src: "../../node_modules/@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2",
  variable: "--font-public-sans",
  weight: "100 900",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  display: "swap",
  preload: false,
});

export const fontVariables = `${vazirmatn.variable} ${publicSans.variable} ${jetbrainsMono.variable}`;
