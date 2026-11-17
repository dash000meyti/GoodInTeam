import { describe, expect, it } from "vitest";
import {
  accentShare,
  ICON_TONES,
  panelIconNames,
  panelIcons,
  pixelIconNames,
  pixelIcons,
  siteIconNames,
  siteIcons,
} from "./pixel-icons";

const SITE = [
  "work",
  "services",
  "blog",
  "learn",
  "about",
  "studio",
  "code",
  "contact",
  "sign-in",
  "more",
  "search",
  "globe",
  "arrow",
];

/** One per panel dock app of every role (owner 16, member 9, client 5) + the client portal. */
const PANEL = [
  "dashboard",
  "portal",
  "time",
  "calendar",
  "tasks",
  "projects",
  "clients",
  "finance",
  "invoices",
  "contracts",
  "docs",
  "vault",
  "content",
  "inbox",
  "media",
  "settings",
  "design-system",
];

/** Above the ≤20% accent rule with the owner's approval (2026-11-17, docs/brand.md). */
const ACCENT_EXCEPTIONS = new Set(["more"]);

describe("pixel icons", () => {
  it("is exactly the 13 site icons of spec §4.3 plus the panel set", () => {
    expect([...siteIconNames].sort()).toEqual([...SITE].sort());
    expect([...panelIconNames].sort()).toEqual([...PANEL].sort());
    // no name in both sets (the spread in pixelIcons would silently drop one)
    expect(pixelIconNames).toHaveLength(SITE.length + PANEL.length);
    for (const name of panelIconNames) expect(name in siteIcons, name).toBe(false);
  });

  it("every icon is 12×12 with allowed characters only", () => {
    for (const [name, rows] of Object.entries(pixelIcons)) {
      expect(rows, name).toHaveLength(12);
      for (const r of rows) {
        expect(r, name).toHaveLength(12);
        expect(r, name).toMatch(/^[.#y]+$/);
      }
    }
  });

  it("the outer ring of cells is empty", () => {
    for (const [name, rows] of Object.entries(pixelIcons)) {
      expect(rows[0], name).toBe(".".repeat(12));
      expect(rows[11], name).toBe(".".repeat(12));
      for (const r of rows) {
        expect(r[0], name).toBe(".");
        expect(r[11], name).toBe(".");
      }
    }
  });

  it("each icon has at most two tones and draws something", () => {
    for (const [name, rows] of Object.entries(pixelIcons)) {
      const used = new Set(rows.join("").replaceAll(".", ""));
      expect(used.size, name).toBeGreaterThan(0);
      expect(used.size, name).toBeLessThanOrEqual(2);
      for (const ch of used) expect(ch in ICON_TONES, name).toBe(true);
    }
  });

  it("the accent stays on ≤20% of the filled cells", () => {
    expect(accentShare(["#y##"])).toBe(0.25);
    expect(accentShare([".."])).toBe(0);
    for (const [name, rows] of Object.entries(pixelIcons)) {
      if (ACCENT_EXCEPTIONS.has(name)) continue;
      expect(accentShare(rows), name).toBeLessThanOrEqual(0.2);
    }
    // the panel set has no exception
    for (const [name, rows] of Object.entries(panelIcons))
      expect(accentShare(rows), name).toBeLessThanOrEqual(0.2);
  });

  it("the arrow is the given grid and vertically symmetric", () => {
    const a = pixelIcons.arrow;
    expect(a[5]).toBe(".##########.");
    for (let y = 0; y < 12; y++) expect(a[y]).toBe(a[11 - y]);
  });
});
