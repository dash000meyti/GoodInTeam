import { describe, expect, it } from "vitest";
import { stripLocale } from "@/i18n/config";
import { isActivePath } from "./match";

describe("isActivePath", () => {
  it("matches a section and everything below it", () => {
    expect(isActivePath("/work", "/work")).toBe(true);
    expect(isActivePath("/work/acme", "/work")).toBe(true);
    expect(isActivePath("/workshop", "/work")).toBe(false);
    expect(isActivePath("/blog", "/work")).toBe(false);
  });

  it("matches home only exactly", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/work", "/")).toBe(false);
  });

  it("honours exact", () => {
    expect(isActivePath("/panel", "/panel", true)).toBe(true);
    expect(isActivePath("/panel/time", "/panel", true)).toBe(false);
    expect(isActivePath("/panel/time", "/panel")).toBe(true);
  });

  it("never activates an entry without a section", () => {
    expect(isActivePath("/services", undefined)).toBe(false);
    expect(isActivePath("/services", "")).toBe(false);
  });

  it("ignores trailing slashes, queries and fragments", () => {
    expect(isActivePath("/work/", "/work")).toBe(true);
    expect(isActivePath("/blog?q=x", "/blog")).toBe(true);
    expect(isActivePath("/services#studio", "/services")).toBe(true);
  });

  it("works on stripLocale output for both locales", () => {
    expect(isActivePath(stripLocale("/en/work/x").path, "/work")).toBe(true);
    expect(isActivePath(stripLocale("/en").path, "/")).toBe(true);
    expect(isActivePath(stripLocale("/blog").path, "/blog")).toBe(true);
  });
});
