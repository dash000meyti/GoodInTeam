export const colorPresets = ["yellow", "green", "cyan", "purple", "blue", "orange", "red"] as const;
export type ColorPreset = (typeof colorPresets)[number];

/** The preset that lives in `:root` (no `data-preset` attribute, correct on first paint). */
export const DEFAULT_PRESET: ColorPreset = "yellow";

export const presetSwatches: Record<ColorPreset, string> = {
  yellow: "#FFC50D",
  green: "#00A76F",
  cyan: "#078DEE",
  purple: "#7635DC",
  blue: "#0C68E9",
  orange: "#FDA92D",
  red: "#FF3030",
};

export const PRESET_STORAGE_KEY = "gt-preset";
/** localStorage: `"reduce"` mirrors the OS reduced-motion setting (`html[data-motion=reduce]`). */
export const MOTION_STORAGE_KEY = "gt-motion";
/** sessionStorage: set once the boot animation has played in this tab. */
export const BOOT_SESSION_KEY = "gt-boot";

/** Runs before paint: applies the saved color preset to <html data-preset>. */
export const presetInitScript = `try{var p=localStorage.getItem("${PRESET_STORAGE_KEY}");if(p&&p!=="${DEFAULT_PRESET}")document.documentElement.setAttribute("data-preset",p)}catch(e){}`;

/**
 * Runs before paint (spec §5.6): applies the saved reduce-motion switch and
 * marks the once-per-session boot as done. On the first load of a session
 * `data-booted` is set 1s after `load` (the ≤0.56s boot animations started at
 * first paint and have finished by then), so a menu bar or dock that a later
 * soft navigation mounts (site → /login → /panel) never replays it (A23).
 */
export const bootInitScript = `try{var h=document.documentElement,b=function(){h.setAttribute("data-booted","")};if(localStorage.getItem("${MOTION_STORAGE_KEY}")==="reduce")h.setAttribute("data-motion","reduce");
if(sessionStorage.getItem("${BOOT_SESSION_KEY}"))b();else{sessionStorage.setItem("${BOOT_SESSION_KEY}","1");addEventListener("load",function(){setTimeout(b,1e3)},{once:true})}}catch(e){}`;
