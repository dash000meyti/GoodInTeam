import { describe, expect, it } from "vitest";
import {
  SHELL_COOKIE,
  defaultShell,
  isCommandPaletteShortcut,
  readShellCookie,
  shellCookie,
  shellInitScript,
  shellValue,
  type ShellPrefs,
} from "./panel-prefs";

const ev = (over: Partial<KeyboardEvent>) =>
  ({ key: "k", code: "KeyK", metaKey: false, ctrlKey: false, altKey: false, ...over }) as Pick<
    KeyboardEvent,
    "key" | "code" | "metaKey" | "ctrlKey" | "altKey"
  >;

describe("isCommandPaletteShortcut (re-exported from shell/shortcuts)", () => {
  it("matches ⌘K / Ctrl+K on Latin and Persian layouts", () => {
    expect(isCommandPaletteShortcut(ev({ metaKey: true }))).toBe(true);
    expect(isCommandPaletteShortcut(ev({ ctrlKey: true, key: "ن" }))).toBe(true);
    expect(isCommandPaletteShortcut(ev({ key: "k" }))).toBe(false);
  });
});

describe("shell cookie", () => {
  it("defaults: 48px dock, magnification on, no auto-hide, normal windows", () => {
    expect(defaultShell).toEqual({ dock: 48, magnify: true, autohide: false, wide: false });
    expect(shellValue(defaultShell)).toBe("48.1.0.0");
  });

  it("round-trips every combination through a cookie header", () => {
    for (const dock of [40, 48, 56] as const)
      for (const magnify of [true, false])
        for (const autohide of [true, false])
          for (const wide of [true, false]) {
            const p: ShellPrefs = { dock, magnify, autohide, wide };
            const pair = shellCookie(p).split(";")[0]!;
            expect(readShellCookie(`theme=dark; ${pair}; other=1`)).toEqual(p);
            expect(readShellCookie(pair)).toEqual(p);
          }
  });

  it("is persistent and site-wide", () => {
    expect(shellCookie(defaultShell)).toBe(
      `${SHELL_COOKIE}=48.1.0.0; path=/; max-age=31536000; samesite=lax`,
    );
  });

  it("is null when unset or malformed", () => {
    expect(readShellCookie(undefined)).toBeNull();
    expect(readShellCookie(null)).toBeNull();
    expect(readShellCookie("")).toBeNull();
    expect(readShellCookie("a=1; b=2")).toBeNull();
    for (const bad of [
      "gt-shell=44.1.0.0", // unknown size
      "gt-shell=48.2.0.0", // not a bit
      "gt-shell=48.1.0", // too short
      "gt-shell=48.1.0.0.1", // too long
      "gt-shell=48-1-0-0",
      "xgt-shell=48.1.0.0", // another cookie's suffix
      "gt-shell=",
    ])
      expect(readShellCookie(bad), bad).toBeNull();
  });
});

describe("shellInitScript", () => {
  const run = (cookie: string, initial: Record<string, string> = {}) => {
    const attrs: Record<string, string> = { ...initial };
    const document = {
      cookie,
      documentElement: {
        setAttribute: (k: string, v: string) => (attrs[k] = v),
        removeAttribute: (k: string) => delete attrs[k],
      },
    };
    new Function("document", shellInitScript)(document);
    return attrs;
  };

  it("applies size, auto-hide and wide windows from the cookie", () => {
    expect(run("a=1; gt-shell=56.0.1.1; b=2")).toEqual({
      "data-dock-size": "56",
      "data-dock-autohide": "",
      "data-window-wide": "",
    });
    expect(run("gt-shell=40.1.0.0")).toEqual({ "data-dock-size": "40" });
  });

  it("removes stale attributes when the cookie turns them off", () => {
    expect(run("gt-shell=48.1.0.0", { "data-dock-autohide": "", "data-window-wide": "" })).toEqual({
      "data-dock-size": "48",
    });
  });

  it("does nothing without a valid cookie", () => {
    expect(run("")).toEqual({});
    expect(run("gt-shell=99.1.0.0")).toEqual({});
    expect(run("xgt-shell=56.1.1.1")).toEqual({});
  });

  it("uses the same strict pattern as readShellCookie", () => {
    for (const c of ["gt-shell=48.1.1.0", "x=1; gt-shell=40.0.0.1", "gt-shell=48.1.1"]) {
      const parsed = readShellCookie(c);
      const attrs = run(c);
      expect("data-dock-size" in attrs).toBe(parsed !== null);
      if (parsed) {
        expect(attrs["data-dock-size"]).toBe(String(parsed.dock));
        expect("data-dock-autohide" in attrs).toBe(parsed.autohide);
        expect("data-window-wide" in attrs).toBe(parsed.wide);
      }
    }
  });
});
