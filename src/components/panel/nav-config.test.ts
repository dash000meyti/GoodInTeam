import { describe, expect, it } from "vitest";
import { panelIconNames } from "@/components/brand/pixel-icons";
import { matchNav, mobilePins, navForRole, navKeyFor, panelNav } from "./nav-config";

const count = (role: Parameters<typeof navForRole>[0]) =>
  navForRole(role).reduce((n, g) => n + g.items.length, 0);

describe("navForRole", () => {
  it("gives owner/admin 16, member 9 and client 5 items, overview first", () => {
    expect(count("owner")).toBe(16);
    expect(count("admin")).toBe(16);
    expect(count("member")).toBe(9);
    expect(count("client")).toBe(5);
    for (const role of ["owner", "admin", "member", "client"] as const)
      expect(navForRole(role)[0]!.label).toBe("groupOverview");
  });

  it("never shows staff or admin modules to clients", () => {
    const labels = navForRole("client").flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(["portalHome", "projects", "invoices", "contracts", "settings"]);
  });

  it("gives every app of every role its own pixel icon from the panel set", () => {
    const items = panelNav.flatMap((g) => g.items);
    const pixels = items.map((i) => i.pixel);
    for (const [i, pixel] of pixels.entries()) {
      expect(pixel, items[i]!.label).toBeDefined();
      expect(panelIconNames, items[i]!.label).toContain(pixel);
    }
    expect(new Set(pixels).size).toBe(items.length); // no two apps share an icon
    expect([...panelIconNames].sort()).toEqual([...(pixels as string[])].sort());
  });
});

describe("mobilePins", () => {
  it("pins only modules the role can open (staff 4 + More, client 5)", () => {
    for (const role of ["owner", "admin", "member", "client"] as const) {
      const labels = new Set(navForRole(role).flatMap((g) => g.items.map((i) => i.label)));
      for (const pin of mobilePins[role]) expect(labels.has(pin), `${role}:${pin}`).toBe(true);
    }
    expect(mobilePins.owner).toHaveLength(4);
    expect(mobilePins.member).toHaveLength(4);
    expect(mobilePins.client).toHaveLength(5);
  });
});

describe("matchNav", () => {
  it("finds the module by longest prefix", () => {
    expect(matchNav("/panel/time")?.label).toBe("time");
    expect(matchNav("/panel/time/reports")?.label).toBe("time");
    expect(matchNav("/panel/settings/appearance")?.label).toBe("settings");
    expect(matchNav("/panel/design-system")?.label).toBe("designSystem");
    expect(matchNav("/panel/projects/abc/")?.label).toBe("projects");
  });

  it("is null for the desktop and unknown paths", () => {
    expect(matchNav("/panel")).toBeNull();
    expect(matchNav("/panel/")).toBeNull();
    expect(matchNav("/panel/timeline")).toBeNull();
    expect(matchNav("/blog")).toBeNull();
  });

  it("maps /panel to the dashboard or the portal home by role", () => {
    expect(navKeyFor("/panel", "owner")).toBe("dashboard");
    expect(navKeyFor("/panel", "client")).toBe("portalHome");
    expect(navKeyFor("/panel/vault", "member")).toBe("vault");
  });
});
