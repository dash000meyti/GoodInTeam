/**
 * Tiny, dependency-free User-Agent parser — just enough to label a session
 * ("Chrome on macOS", "Safari on iPhone"). Pure: safe on server and client.
 *
 * Order matters: many browsers embed other browsers' tokens (Edge and Opera
 * contain "Chrome", Chrome contains "Safari", iPadOS may claim "Macintosh").
 */
export type DeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

export interface ParsedUserAgent {
  /** Browser / client name, e.g. "Chrome", "Firefox", "curl". null when unknown. */
  browser: string | null;
  /** Major version as a string ("128"), when detectable. */
  version: string | null;
  /** Operating system, e.g. "macOS", "Windows", "iOS", "Android". null when unknown. */
  os: string | null;
  device: DeviceType;
}

const BROWSERS: [name: string, re: RegExp][] = [
  ["Edge", /\b(?:Edg|EdgA|EdgiOS|Edge)\/(\d+)/],
  ["Opera", /\b(?:OPR|OPiOS|Opera)\/(\d+)/],
  ["Samsung Internet", /\bSamsungBrowser\/(\d+)/],
  ["Yandex", /\bYaBrowser\/(\d+)/],
  ["Vivaldi", /\bVivaldi\/(\d+)/],
  ["Brave", /\bBrave\/(\d+)/],
  ["Firefox", /\b(?:Firefox|FxiOS)\/(\d+)/],
  ["Chrome", /\b(?:HeadlessChrome|Chrome|CriOS|Chromium)\/(\d+)/],
  ["Safari", /\bVersion\/(\d+)(?:\.\d+)*(?: Mobile\/\w+)? Safari\//],
  ["curl", /^curl\/(\d+)/],
  ["Postman", /\bPostmanRuntime\/(\d+)/],
  ["Node.js", /^(?:node-fetch|undici|node)(?:\/(\d+))?/i],
  ["Python", /\b(?:python-requests|python-httpx|aiohttp|Python-urllib)\/(\d+)/i],
];

const BOT = /bot|crawler|spider|crawling|slurp|facebookexternalhit|preview/i;

function detectOs(ua: string): string | null {
  if (/Windows Phone/i.test(ua)) return "Windows Phone";
  if (/Windows NT|Win64|Win32/i.test(ua)) return "Windows";
  if (/iPhone|iPod/.test(ua)) return "iOS";
  if (/iPad/.test(ua)) return "iPadOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/Ubuntu/i.test(ua)) return "Ubuntu";
  if (/Linux|X11/i.test(ua)) return "Linux";
  return null;
}

function detectDevice(ua: string, os: string | null): DeviceType {
  if (BOT.test(ua)) return "bot";
  if (os === "iPadOS" || /Tablet/i.test(ua)) return "tablet";
  // Android tablets omit "Mobile" from the UA.
  if (os === "Android") return /Mobile/i.test(ua) ? "mobile" : "tablet";
  if (os === "iOS" || os === "Windows Phone" || /Mobile|Mobi/i.test(ua)) return "mobile";
  if (os) return "desktop";
  return "unknown";
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  const s = (ua ?? "").trim();
  if (!s) return { browser: null, version: null, os: null, device: "unknown" };
  let browser: string | null = null;
  let version: string | null = null;
  for (const [name, re] of BROWSERS) {
    const m = re.exec(s);
    if (m) {
      browser = name;
      version = m[1] ?? null;
      break;
    }
  }
  const os = detectOs(s);
  return { browser, version, os, device: detectDevice(s, os) };
}

/**
 * Short English-agnostic label parts for UI: `{ browser: "Chrome", os: "macOS" }`.
 * Callers localize the joining word ("Chrome on macOS" / "Chrome روی macOS").
 */
export function userAgentLabel(
  parsed: ParsedUserAgent,
  template: (parts: { browser: string; os: string }) => string,
  unknown: string,
) {
  if (parsed.browser && parsed.os) return template({ browser: parsed.browser, os: parsed.os });
  return parsed.browser ?? parsed.os ?? unknown;
}
