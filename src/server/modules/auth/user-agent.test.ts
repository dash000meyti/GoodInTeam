import { describe, expect, it } from "vitest";
import { parseUserAgent, userAgentLabel } from "./user-agent";

const UA = {
  chromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  edgeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.2651.74",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
  firefoxUbuntu: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/127.0.6533.107 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  samsung:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  opera:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0",
  chromeOs:
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  headless:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  curl: "curl/8.7.1",
  node: "node",
};

describe("parseUserAgent", () => {
  it.each([
    ["chromeMac", "Chrome", "128", "macOS", "desktop"],
    ["safariMac", "Safari", "17", "macOS", "desktop"],
    ["edgeWin", "Edge", "127", "Windows", "desktop"],
    ["firefoxLinux", "Firefox", "129", "Linux", "desktop"],
    ["firefoxUbuntu", "Firefox", "125", "Ubuntu", "desktop"],
    ["safariIphone", "Safari", "17", "iOS", "mobile"],
    ["chromeIos", "Chrome", "127", "iOS", "mobile"],
    ["ipad", "Safari", "16", "iPadOS", "tablet"],
    ["chromeAndroid", "Chrome", "128", "Android", "mobile"],
    ["androidTablet", "Chrome", "126", "Android", "tablet"],
    ["samsung", "Samsung Internet", "25", "Android", "mobile"],
    ["opera", "Opera", "112", "Windows", "desktop"],
    ["chromeOs", "Chrome", "128", "ChromeOS", "desktop"],
    ["headless", "Chrome", "140", "Linux", "desktop"],
  ] as const)("%s → %s on %s", (key, browser, version, os, device) => {
    expect(parseUserAgent(UA[key])).toEqual({ browser, version, os, device });
  });

  it("detects bots", () => {
    expect(parseUserAgent(UA.googlebot).device).toBe("bot");
  });

  it("handles CLI clients", () => {
    expect(parseUserAgent(UA.curl)).toMatchObject({ browser: "curl", version: "8", os: null });
    expect(parseUserAgent(UA.node).browser).toBe("Node.js");
  });

  it("handles empty / unknown values", () => {
    expect(parseUserAgent(null)).toEqual({
      browser: null,
      version: null,
      os: null,
      device: "unknown",
    });
    expect(parseUserAgent("   ").device).toBe("unknown");
    expect(parseUserAgent("SomethingElse/1.0")).toMatchObject({ browser: null, os: null });
  });
});

describe("userAgentLabel", () => {
  const tpl = ({ browser, os }: { browser: string; os: string }) => `${browser} on ${os}`;
  it("joins browser and OS", () => {
    expect(userAgentLabel(parseUserAgent(UA.chromeMac), tpl, "Unknown")).toBe("Chrome on macOS");
  });
  it("falls back to whatever is known", () => {
    expect(userAgentLabel(parseUserAgent(UA.curl), tpl, "Unknown")).toBe("curl");
    expect(userAgentLabel(parseUserAgent(""), tpl, "Unknown")).toBe("Unknown");
  });
});
