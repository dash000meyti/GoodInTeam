import { describe, expect, it } from "vitest";
import { MAX_NEXT_LENGTH, safeNext } from "./safe-next";

const FALLBACK = "/panel";

describe("safeNext", () => {
  it("keeps same-origin relative paths (with query and hash)", () => {
    expect(safeNext("/panel/projects", FALLBACK)).toBe("/panel/projects");
    expect(safeNext("/en/panel/time?view=week#today", FALLBACK)).toBe(
      "/en/panel/time?view=week#today",
    );
    expect(safeNext("/", FALLBACK)).toBe("/");
  });

  it("normalises dot segments without leaving the origin", () => {
    expect(safeNext("/panel/../blog", FALLBACK)).toBe("/blog");
    expect(safeNext("/../../etc", FALLBACK)).toBe("/etc");
  });

  it("falls back for missing or non-string values", () => {
    expect(safeNext(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeNext(null, FALLBACK)).toBe(FALLBACK);
    expect(safeNext("", FALLBACK)).toBe(FALLBACK);
    expect(safeNext(42, FALLBACK)).toBe(FALLBACK);
  });

  it.each([
    ["protocol-relative", "//evil.com"],
    ["protocol-relative with path", "//evil.com/panel"],
    ["backslash", "/\\evil.com"],
    ["double backslash", "\\\\evil.com"],
    ["mixed slashes", "/\\/evil.com"],
    ["tab", "/\t/evil.com"],
    ["newline", "/\n/evil.com"],
    ["carriage return", "/\r/evil.com"],
    ["leading tab", "\t//evil.com"],
    ["null byte", "/\u0000/evil.com"],
    ["DEL", "/\u007f/evil.com"],
    ["C1 control", "/\u0085/evil.com"],
    ["absolute http", "http://evil.com"],
    ["absolute https", "https://evil.com/panel"],
    ["javascript scheme", "javascript:alert(1)"],
    ["data scheme", "data:text/html,hi"],
    ["scheme-relative with userinfo", "//user@evil.com"],
    ["no leading slash", "panel"],
    ["dot relative", "./panel"],
    ["leading space", " /panel"],
  ])("rejects %s", (_label, value) => {
    expect(safeNext(value, FALLBACK)).toBe(FALLBACK);
  });

  it("caps the length", () => {
    const ok = `/${"a".repeat(MAX_NEXT_LENGTH - 1)}`;
    expect(safeNext(ok, FALLBACK)).toBe(ok);
    expect(safeNext(`${ok}a`, FALLBACK)).toBe(FALLBACK);
    expect(safeNext(`/${"a".repeat(100_000)}`, FALLBACK)).toBe(FALLBACK);
  });

  it("keeps percent-encoded characters on the same origin", () => {
    expect(safeNext("/%09/evil.com", FALLBACK)).toBe("/%09/evil.com");
    expect(safeNext("/%2F%2Fevil.com", FALLBACK)).toBe("/%2F%2Fevil.com");
  });
});
