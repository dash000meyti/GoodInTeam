import { describe, expect, it } from "vitest";
import { milestoneInput, projectInput, updateMilestoneInput, updateProjectInput } from "./schemas";
import { clientInput, updateClientInput } from "../clients/schemas";

describe("updateProjectInput", () => {
  it("a partial update contains only the keys that were sent (no defaults)", () => {
    expect(updateProjectInput.parse({ id: "p1", name: "Renamed" })).toEqual({
      id: "p1",
      name: "Renamed",
    });
  });

  it("does not reset share flags, status or currency when absent", () => {
    const out = updateProjectInput.parse({ id: "p1", shareTime: true });
    expect(out).toEqual({ id: "p1", shareTime: true });
    for (const k of ["status", "currency", "billingType", "progressMode", "color", "shareProgress"])
      expect(k in out).toBe(false);
  });

  it("form submissions: empty values clear nullable fields", () => {
    const out = updateProjectInput.parse({
      id: "p1",
      startDate: "",
      dueDate: "",
      budget: "",
      hourlyRate: "",
      estimateHours: "",
      clientId: "",
    });
    expect(out).toMatchObject({
      startDate: null,
      dueDate: null,
      budget: null,
      hourlyRate: null,
      estimateHours: null,
      clientId: null,
    });
  });

  it("JSON null clears too; absent stays untouched", () => {
    const out = updateProjectInput.parse({ id: "p1", dueDate: null, budget: null });
    expect(out).toEqual({ id: "p1", dueDate: null, budget: null });
  });

  it("parses localized money and validates bounds", () => {
    expect(updateProjectInput.parse({ id: "p1", budget: "۱۲٬۵۰۰" }).budget).toBe(12500);
    expect(updateProjectInput.parse({ id: "p1", hourlyRate: "12,500.5" }).hourlyRate).toBe(12500.5);
    expect(updateProjectInput.safeParse({ id: "p1", budget: "-5" }).success).toBe(false);
    expect(updateProjectInput.safeParse({ id: "p1", budget: "1e3" }).success).toBe(false);
    expect(updateProjectInput.safeParse({ id: "p1", progress: "150" }).success).toBe(false);
  });

  it("validates currency codes and dates", () => {
    expect(updateProjectInput.parse({ id: "p1", currency: "usd" }).currency).toBe("USD");
    for (const currency of ["XYZ", "toString", "__proto__"])
      expect(updateProjectInput.safeParse({ id: "p1", currency }).success).toBe(false);
    expect(updateProjectInput.safeParse({ id: "p1", dueDate: "2026-02-30" }).success).toBe(false);
  });
});

describe("projectInput (create)", () => {
  it("still applies defaults on create", () => {
    const out = projectInput.parse({ name: "New" });
    expect(out).toMatchObject({
      name: "New",
      status: "active",
      currency: "IRT",
      billingType: "hourly",
      progressMode: "milestones",
      color: "#00A76F",
    });
    expect(out.budget).toBeUndefined();
    expect(out.startDate).toBeUndefined();
  });

  it("rejects unsupported currencies", () => {
    expect(projectInput.safeParse({ name: "x", currency: "BTC" }).success).toBe(false);
    expect(projectInput.safeParse({ name: "x", currency: "constructor" }).success).toBe(false);
  });
});

describe("milestones", () => {
  it("toggling the status doesn't touch visibleToClient / weight / title", () => {
    expect(updateMilestoneInput.parse({ id: "m1", status: "done" })).toEqual({
      id: "m1",
      status: "done",
    });
  });

  it("can't move a milestone to another project", () => {
    expect("projectId" in updateMilestoneInput.parse({ id: "m1", projectId: "other" })).toBe(false);
  });

  it("create keeps its defaults", () => {
    expect(milestoneInput.parse({ projectId: "p1", title: "M" })).toMatchObject({
      status: "planned",
      weight: 1,
      visibleToClient: true,
    });
    expect(milestoneInput.parse({ projectId: "p1", title: "M", weight: "۳" }).weight).toBe(3);
    expect(milestoneInput.safeParse({ projectId: "p1", title: "M", weight: "0" }).success).toBe(
      false,
    );
  });

  it("an empty due date clears it on update", () => {
    expect(updateMilestoneInput.parse({ id: "m1", dueDate: "" }).dueDate).toBeNull();
  });
});

describe("clients", () => {
  it("a partial client update keeps kind and currency untouched", () => {
    expect(updateClientInput.parse({ id: "c1", name: "Acme" })).toEqual({ id: "c1", name: "Acme" });
  });

  it("validates the default currency", () => {
    expect(clientInput.parse({ name: "Acme" }).defaultCurrency).toBe("IRT");
    expect(clientInput.safeParse({ name: "Acme", defaultCurrency: "toString" }).success).toBe(
      false,
    );
    expect(updateClientInput.safeParse({ id: "c1", defaultCurrency: "ABC" }).success).toBe(false);
  });
});
