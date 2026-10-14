/**
 * Tiny, dependency-free user-agent summary for the audit trail
 * ("Chrome · Android"). The raw UA string is always kept in the DB.
 */
export function describeUserAgent(ua: string | null | undefined) {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser\//.test(ua)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS\//.test(ua)
          ? "Firefox"
          : /Chrome\/|CriOS\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : null;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  const mobile = /Mobile|iPhone|Android/.test(ua);
  const parts = [browser, os].filter(Boolean);
  if (!parts.length) return ua.slice(0, 60);
  return parts.join(" · ") + (mobile && os !== "iOS" && os !== "Android" ? " (mobile)" : "");
}
