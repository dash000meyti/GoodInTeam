import { describe, expect, it } from "vitest";
import {
  SIDEBAR_COOKIE,
  isCommandPaletteShortcut,
  readSidebarCookie,
  sidebarCookie,
  sidebarInitScript,
} from "./panel-prefs";

const ev = (over: Partial<KeyboardEvent>) =>
  ({ key: "k", code: "KeyK", metaKey: false, ctrlKey: false, altKey: false, ...over }) as Pick<
    KeyboardEvent,
    "key" | "code" | "metaKey" | "ctrlKey" | "altKey"
  >;

describe("isCommandPaletteShortcut", () => {
  it("matches ⌘K and Ctrl+K on a Latin layout", () => {
    expect(isCommandPaletteShortcut(ev({ metaKey: true }))).toBe(true);
    expect(isCommandPaletteShortcut(ev({ ctrlKey: true }))).toBe(true);
    expect(isCommandPaletteShortcut(ev({ ctrlKey: true, key: "K" }))).toBe(true);
  });

  it("matches the physical K key on a Persian layout", () => {
    expect(isCommandPaletteShortcut(ev({ metaKey: true, key: "ن" }))).toBe(true);
    expect(isCommandPaletteShortcut(ev({ ctrlKey: true, key: "л" }))).toBe(true);
  });

  it("needs ⌘ or Ctrl and ignores Alt combinations", () => {
    expect(isCommandPaletteShortcut(ev({}))).toBe(false);
    expect(isCommandPaletteShortcut(ev({ key: "ن" }))).toBe(false);
    expect(isCommandPaletteShortcut(ev({ metaKey: true, altKey: true }))).toBe(false);
  });

  it("follows the letter on remapped Latin layouts (Dvorak)", () => {
    // Dvorak: the physical K key types "t" — ⌘T must stay "new tab".
    expect(isCommandPaletteShortcut(ev({ metaKey: true, key: "t", code: "KeyK" }))).toBe(false);
    // …and "k" sits on the physical V key.
    expect(isCommandPaletteShortcut(ev({ metaKey: true, key: "k", code: "KeyV" }))).toBe(true);
  });

  it("does not fire for other keys", () => {
    expect(isCommandPaletteShortcut(ev({ metaKey: true, key: "j", code: "KeyJ" }))).toBe(false);
    expect(isCommandPaletteShortcut(ev({ metaKey: true, key: "ت", code: "KeyJ" }))).toBe(false);
  });
});

describe("sidebar cookie", () => {
  it("round-trips through a cookie header", () => {
    const pair = sidebarCookie(true).split(";")[0]!;
    expect(readSidebarCookie(`theme=dark; ${pair}; other=1`)).toBe(true);
    expect(readSidebarCookie(sidebarCookie(false).split(";")[0])).toBe(false);
  });

  it("is null when unset", () => {
    expect(readSidebarCookie("")).toBeNull();
    expect(readSidebarCookie(undefined)).toBeNull();
    expect(readSidebarCookie(`x${SIDEBAR_COOKIE}=1`)).toBeNull();
  });

  it("is persistent and site-wide", () => {
    expect(sidebarCookie(true)).toMatch(/; path=\/; max-age=31536000; samesite=lax$/);
  });

  it("init script marks <html> only when collapsed", () => {
    const run = (cookie: string) => {
      const attrs: Record<string, string> = {};
      const document = {
        cookie,
        documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) },
      };
      new Function("document", sidebarInitScript)(document);
      return "data-sidebar-collapsed" in attrs;
    };
    expect(run(`a=1; ${SIDEBAR_COOKIE}=1`)).toBe(true);
    expect(run(`${SIDEBAR_COOKIE}=1; a=1`)).toBe(true);
    expect(run(`${SIDEBAR_COOKIE}=0`)).toBe(false);
    expect(run(`${SIDEBAR_COOKIE}=10`)).toBe(false);
    expect(run("")).toBe(false);
  });
});
