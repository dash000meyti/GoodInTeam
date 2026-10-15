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

/** Inline CSS variables that re-skin a subtree with another preset. */
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
  { name: "background", tw: "background", light: "#ffffff", dark: "#141a21" },
  { name: "foreground", tw: "foreground", light: "#1c252e", dark: "#ffffff" },
  { name: "card", tw: "card", light: "#ffffff", dark: "#1c252e" },
  { name: "popover", tw: "popover", light: "#ffffff", dark: "#1c252e" },
  { name: "muted", tw: "muted", light: "#f4f6f8", dark: "#28323d" },
  { name: "muted-foreground", tw: "muted-foreground", light: "#637381", dark: "#919eab" },
  { name: "secondary", tw: "secondary", light: "#f4f6f8", dark: "#28323d" },
  {
    name: "accent",
    tw: "accent",
    light: "rgb(145 158 171 / 0.08)",
    dark: "rgb(145 158 171 / 0.12)",
  },
  {
    name: "border",
    tw: "border",
    light: "rgb(145 158 171 / 0.2)",
    dark: "rgb(145 158 171 / 0.16)",
  },
  { name: "input", tw: "input", light: "rgb(145 158 171 / 0.32)", dark: "rgb(145 158 171 / 0.24)" },
];

/** Status colors (same in light and dark; use /16 alpha for soft surfaces). */
export const statusTokens: ColorToken[] = [
  { name: "success", tw: "success", light: "#22c55e", dark: "#22c55e" },
  { name: "warning", tw: "warning", light: "#ffab00", dark: "#ffab00" },
  { name: "info", tw: "info", light: "#00b8d9", dark: "#00b8d9" },
  { name: "destructive", tw: "destructive", light: "#ff5630", dark: "#ff5630" },
  { name: "violet", tw: "violet", light: "#8e33ff", dark: "#8e33ff" },
];

/** Chart palette (chart-1 follows the primary preset). */
export const chartTokens: ColorToken[] = [
  { name: "chart-1", tw: "chart-1", light: "var(--primary)", dark: "var(--primary)" },
  { name: "chart-2", tw: "chart-2", light: "#8e33ff", dark: "#8e33ff" },
  { name: "chart-3", tw: "chart-3", light: "#0086a8", dark: "#00b8d9" },
  { name: "chart-4", tw: "chart-4", light: "#c27a00", dark: "#ffab00" },
  { name: "chart-5", tw: "chart-5", light: "#ff5630", dark: "#ff5630" },
];

/** Minimals grey scale (theme-independent): bg-grey-500/16, text-grey-600… */
export const greyScale: { step: number; value: string }[] = [
  { step: 50, value: "#fcfdfd" },
  { step: 100, value: "#f9fafb" },
  { step: 200, value: "#f4f6f8" },
  { step: 300, value: "#dfe3e8" },
  { step: 400, value: "#c4cdd5" },
  { step: 500, value: "#919eab" },
  { step: 600, value: "#637381" },
  { step: 700, value: "#454f5b" },
  { step: 800, value: "#1c252e" },
  { step: 900, value: "#141a21" },
];

/** Inline variables for a forced light or dark preview of surface tokens. */
export function themeStyle(mode: "light" | "dark"): Record<string, string> {
  return Object.fromEntries(surfaceTokens.map((t) => [`--${t.name}`, t[mode]]));
}
