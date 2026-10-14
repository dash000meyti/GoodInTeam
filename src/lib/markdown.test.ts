import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("renderMarkdown", () => {
  it("renders headings with ids and escapes raw html by default", async () => {
    const { renderMarkdown } = await import("./markdown");
    const { html, headings } = await renderMarkdown(
      "# سلام دنیا\n\n<script>alert(1)</script>\n\n```ts\nconst a = 1\n```",
    );
    expect(headings[0]).toMatchObject({ depth: 1, text: "سلام دنیا", id: "سلام-دنیا" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("shiki");
  });

  it("computes reading time", async () => {
    const { readingMinutes } = await import("./markdown");
    expect(readingMinutes("word ".repeat(1000))).toBe(5);
  });
});
