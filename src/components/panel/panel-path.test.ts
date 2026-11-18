import { describe, expect, it } from "vitest";
import { framePath } from "@/components/shell/frame";
import { panelAppName, panelPathSegments } from "./panel-path";

describe("panelPathSegments", () => {
  it("keeps route words and drops the locale, 'panel' and ids", () => {
    expect(panelPathSegments("/panel")).toEqual([]);
    expect(panelPathSegments("/en/panel")).toEqual([]);
    expect(panelPathSegments("/panel/invoices")).toEqual(["invoices"]);
    expect(panelPathSegments("/en/panel/invoices/yspk4dsde1ggb2z2")).toEqual(["invoices"]);
    expect(panelPathSegments("/panel/settings/profile")).toEqual(["settings", "profile"]);
    expect(panelPathSegments("/panel/finance/ledgers/project/ayx60rt02m3yd6ym")).toEqual([
      "finance",
      "ledgers",
      "project",
    ]);
    expect(panelPathSegments("/panel/design-system/")).toEqual(["design-system"]);
  });

  it("builds the strip path the PageHeader shows", () => {
    expect(framePath("GOOD-IN-TEAM", "PANEL", ...panelPathSegments("/en/panel/time/reports"))).toBe(
      "GOOD-IN-TEAM/PANEL/TIME/REPORTS",
    );
  });
});

describe("panelAppName", () => {
  it("names the decor window after the route's module", () => {
    expect(panelAppName("/en/panel/invoices/abc123", "desktop")).toBe("INVOICES.APP");
    expect(panelAppName("/panel/time/reports", "desktop")).toBe("TIME.APP");
    expect(panelAppName("/panel/design-system", "desktop")).toBe("DESIGN-SYSTEM.APP");
    expect(panelAppName("/panel", "desktop")).toBe("DESKTOP.APP");
  });
});
