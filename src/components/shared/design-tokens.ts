import type { ColorPreset } from "./theme";

/**
 * Design tokens as data — for documentation (Panel → Design system) and for
 * previews that must show a preset/theme other than the active one (Settings →
 * Appearance). Source of truth is src/app/globals.css; design-tokens.test.ts
 * fails if these values drift from it.
 */

export interface PresetScale {
  lighter: string;
  light: string;
  main: string;
  dark: string;
  darker: string;
  /** Text color on `main` (--primary-foreground). */
  contrast: string;
  /** "r g b" for rgb(var(--primary-rgb) / a). */
  rgb: string;
}

export const presetScales: Record<ColorPreset, PresetScale> = {
  yellow: {
    lighter: "#fff3c4",
    light: "#ffdb66",
    main: "#ffc50d",
    dark: "#7a5a00",
    darker: "#4d3800",
    contrast: "#1c1c1e",
    rgb: "255 197 13",
  },
  green: {
    lighter: "#c8fad6",
    light: "#5be49b",
    main: "#00a76f",
    dark: "#007867",
    darker: "#004b50",
    contrast: "#ffffff",
    rgb: "0 167 111",
  },
  cyan: {
    lighter: "#ccf4fe",
    light: "#68cdf9",
    main: "#078dee",
    dark: "#0351ab",
    darker: "#012972",
    contrast: "#ffffff",
    rgb: "7 141 238",
  },
  purple: {
    lighter: "#ebd6fd",
    light: "#b985f4",
    main: "#7635dc",
    dark: "#431a9e",
    darker: "#200a69",
    contrast: "#ffffff",
    rgb: "118 53 220",
  },
  blue: {
    lighter: "#cde9fd",
    light: "#6bb1f8",
    main: "#0c68e9",
    dark: "#063ba7",
    darker: "#021d6f",
    contrast: "#ffffff",
    rgb: "12 104 233",
  },
  orange: {
    lighter: "#fef4d4",
    light: "#fed680",
    main: "#fda92d",
    dark: "#b66816",
    darker: "#793908",
    contrast: "#1c252e",
    rgb: "253 169 45",
  },
  red: {
    lighter: "#ffe3d5",
    light: "#ff9882",
    main: "#ff3030",
    dark: "#b71833",
    darker: "#7a0930",
    contrast: "#ffffff",
    rgb: "255 48 48",
  },
};

/**
 * Class that re-derives every `var(--primary…)`-based token (ink, hover, ring,
 * sidebar, chart-1, shadows) inside a preview subtree. Always render it
 * together with `style={presetStyle(p)}` (spec §3.1).
 */
export const PRESET_SCOPE_CLASS = "preset-scope";

/** Inline CSS variables that re-skin a subtree with another preset (pair with PRESET_SCOPE_CLASS). */
export function presetStyle(p: ColorPreset): Record<string, string> {
  const s = presetScales[p];
  return {
    "--primary-lighter": s.lighter,
    "--primary-light": s.light,
    "--primary": s.main,
    "--primary-dark": s.dark,
    "--primary-darker": s.darker,
    "--primary-foreground": s.contrast,
    "--primary-rgb": s.rgb,
  };
}

export interface ColorToken {
  /** CSS custom property without the leading dashes. */
  name: string;
  /** Tailwind color name (bg-<x>, text-<x>…). */
  tw: string;
  light: string;
  dark: string;
}

/** Surfaces, text and lines. */
export const surfaceTokens: ColorToken[] = [
  { name: "background", tw: "background", light: "#f3f3f3", dark: "#161618" },
  { name: "foreground", tw: "foreground", light: "#1c1c1e", dark: "#f5f5f7" },
  { name: "card", tw: "card", light: "#ffffff", dark: "#1f1f22" },
  { name: "popover", tw: "popover", light: "#ffffff", dark: "#232326" },
  { name: "muted", tw: "muted", light: "#e8e8ea", dark: "#2a2a2d" },
  { name: "muted-foreground", tw: "muted-foreground", light: "#636366", dark: "#a1a1a6" },
  { name: "secondary", tw: "secondary", light: "#e8e8ea", dark: "#2a2a2d" },
  {
    name: "accent",
    tw: "accent",
    light: "rgb(106 106 108 / 0.08)",
    dark: "rgb(255 255 255 / 0.06)",
  },
  {
    name: "border",
    tw: "border",
    light: "rgb(106 106 108 / 0.18)",
    dark: "rgb(255 255 255 / 0.1)",
  },
  { name: "input", tw: "input", light: "rgb(106 106 108 / 0.32)", dark: "rgb(255 255 255 / 0.16)" },
];

/** Status fills (use /16 alpha for soft surfaces; text uses the inks below). */
export const statusTokens: ColorToken[] = [
  { name: "success", tw: "success", light: "#22c55e", dark: "#22c55e" },
  { name: "warning", tw: "warning", light: "#f76b15", dark: "#f76b15" },
  { name: "info", tw: "info", light: "#00b8d9", dark: "#00b8d9" },
  { name: "destructive", tw: "destructive", light: "#ce2c31", dark: "#ff6369" },
  { name: "violet", tw: "violet", light: "#8e33ff", dark: "#8e33ff" },
];

/** Text on the status fills (ink in light mode, so success/info fills never carry white). */
export const statusForegroundTokens: ColorToken[] = [
  { name: "success-foreground", tw: "success-foreground", light: "#1c1c1e", dark: "#1c1c1e" },
  { name: "warning-foreground", tw: "warning-foreground", light: "#1c1c1e", dark: "#1c1c1e" },
  { name: "info-foreground", tw: "info-foreground", light: "#1c1c1e", dark: "#1c1c1e" },
  {
    name: "destructive-foreground",
    tw: "destructive-foreground",
    light: "#ffffff",
    dark: "#1c1c1e",
  },
];

/**
 * Text-safe "ink" tokens (spec §3.4): use these for text, links, icons and
 * focus rings. The bright fills (#FFC50D, #22C55E, #00B8D9, #F76B15) fail as
 * text on light surfaces; the ESLint guard forbids `text-primary|warning|
 * success|info` outside `dark:`.
 */
export const inkTokens: ColorToken[] = [
  {
    name: "primary-ink",
    tw: "primary-ink",
    light: "var(--primary-dark)",
    dark: "var(--primary-light)",
  },
  {
    name: "primary-hover",
    tw: "primary-hover",
    light: "color-mix(in oklab, var(--primary) 86%, black)",
    dark: "color-mix(in oklab, var(--primary) 86%, black)",
  },
  { name: "success-ink", tw: "success-ink", light: "#0b6b42", dark: "#22c55e" },
  { name: "warning-ink", tw: "warning-ink", light: "#a04a00", dark: "#ff9f43" },
  { name: "info-ink", tw: "info-ink", light: "#00618c", dark: "#00b8d9" },
];

/** Chart palette (chart-1 follows the primary preset: ink in light, fill in dark). */
export const chartTokens: ColorToken[] = [
  { name: "chart-1", tw: "chart-1", light: "var(--primary-ink)", dark: "var(--primary)" },
  { name: "chart-2", tw: "chart-2", light: "#8e33ff", dark: "#8e33ff" },
  { name: "chart-3", tw: "chart-3", light: "#0086a8", dark: "#00b8d9" },
  { name: "chart-4", tw: "chart-4", light: "#118d57", dark: "#22c55e" },
  { name: "chart-5", tw: "chart-5", light: "#ce2c31", dark: "#ff6369" },
];

/**
 * OS chrome (Good In OS shell): brand tones of the pixel logo, the desktop
 * wallpaper, frame lines and markers, traffic lights, the guide outline and
 * the dock dot. `tw` is set only where @theme maps a Tailwind color.
 */
export const chromeTokens: ColorToken[] = [
  { name: "brand-yellow", tw: "brand-yellow", light: "#ffc50d", dark: "#ffc50d" },
  { name: "brand-ink", tw: "brand-ink", light: "#6a6a6c", dark: "#a3a4a8" },
  { name: "brand-frame", tw: "brand-frame", light: "#b3b5b9", dark: "#4a4b4f" },
  { name: "brand-soft", tw: "", light: "#caccce", dark: "#5e5f63" },
  { name: "brand-paper", tw: "", light: "#f3f3f3", dark: "#2a2a2d" },
  { name: "desktop", tw: "desktop", light: "#e6e6e9", dark: "#0e0e10" },
  { name: "dots", tw: "", light: "rgb(106 106 108 / 0.28)", dark: "rgb(255 255 255 / 0.07)" },
  { name: "frame-line", tw: "frame-line", light: "#d8d9dc", dark: "#2c2c30" },
  { name: "frame-rail", tw: "", light: "#c2c4c8", dark: "#3a3b3f" },
  { name: "marker-ring", tw: "", light: "#b3b5b9", dark: "#4a4b4f" },
  { name: "marker-fill", tw: "", light: "#f3f3f3", dark: "#161618" },
  { name: "marker-dot", tw: "", light: "#6a6a6c", dark: "#a3a4a8" },
  { name: "light-close", tw: "", light: "#ff5f57", dark: "#ff5f57" },
  { name: "light-min", tw: "", light: "#febc2e", dark: "#febc2e" },
  { name: "light-zoom", tw: "", light: "#28c840", dark: "#28c840" },
  { name: "light-idle", tw: "", light: "#caccce", dark: "#3a3b3f" },
  { name: "guide-line", tw: "", light: "#9a7200", dark: "#ffc50d" },
  { name: "dock-dot", tw: "", light: "rgb(28 28 30 / 0.72)", dark: "#ffc50d" },
];

/** Neutral grey scale (theme-independent): bg-grey-900/10, text-grey-600… */
export const greyScale: { step: number; value: string }[] = [
  { step: 50, value: "#fafafa" },
  { step: 100, value: "#f3f3f3" },
  { step: 200, value: "#e8e8ea" },
  { step: 300, value: "#caccce" },
  { step: 400, value: "#b3b5b9" },
  { step: 500, value: "#8e8e93" },
  { step: 600, value: "#6a6a6c" },
  { step: 700, value: "#48484a" },
  { step: 800, value: "#2c2c2e" },
  { step: 900, value: "#1c1c1e" },
];

/** Inline variables for a forced light or dark preview of surface tokens. */
export function themeStyle(mode: "light" | "dark"): Record<string, string> {
  return Object.fromEntries(surfaceTokens.map((t) => [`--${t.name}`, t[mode]]));
}
