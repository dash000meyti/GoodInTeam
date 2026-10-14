export const colorPresets = ["green", "cyan", "purple", "blue", "orange", "red"] as const;
export type ColorPreset = (typeof colorPresets)[number];

export const presetSwatches: Record<ColorPreset, string> = {
  green: "#00A76F",
  cyan: "#078DEE",
  purple: "#7635DC",
  blue: "#0C68E9",
  orange: "#FDA92D",
  red: "#FF3030",
};

export const PRESET_STORAGE_KEY = "gt-preset";

/** Runs before paint: applies the saved color preset to <html data-preset>. */
export const presetInitScript = `try{var p=localStorage.getItem("${PRESET_STORAGE_KEY}");if(p&&p!=="green")document.documentElement.setAttribute("data-preset",p)}catch(e){}`;
