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

  it("drops dangerous link and image targets", async () => {
    const { renderMarkdown } = await import("./markdown");
    const md = [
      "[a](javascript:alert(1))",
      "[b](JaVaScRiPt:alert(1))",
      "[c](  javascript:alert(1))",
      "[d](vbscript:msgbox(1))",
      "[e](data:text/html;base64,PHNjcmlwdD4=)",
      "<javascript:alert(1)>",
      "[ref][r]",
      "",
      "[r]: javascript:alert(1)",
      "",
      "![x](javascript:alert(1)) ![y](data:image/svg+xml;base64,PHN2Zz4=)",
    ].join("\n\n");
    const { html } = await renderMarkdown(md);
    expect(html.toLowerCase()).not.toMatch(/(href|src)="\s*(javascript|vbscript|data):/);
    expect(html).toContain(">a<"); // link text is kept
    expect(html).not.toContain("<img");
  });

  it("keeps safe links and images", async () => {
    const { renderMarkdown } = await import("./markdown");
    const { html } = await renderMarkdown(
      "[w](https://example.com) [m](mailto:a@b.co) [t](tel:+98912) [r](/blog/x) [h](#top) [q](?page=2) [p](notes.md)\n\n![i](/media/1/a.png)",
    );
    for (const href of [
      "https://example.com",
      "mailto:a@b.co",
      "tel:+98912",
      "/blog/x",
      "#top",
      "?page=2",
      "notes.md",
    ])
      expect(html).toContain(`href="${href}"`);
    expect(html).toContain('src="/media/1/a.png"');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  });
});

describe("safeUrl", () => {
  it("ignores control characters when detecting the scheme", async () => {
    const { safeUrl } = await import("./markdown");
    expect(safeUrl("java\tscript:alert(1)")).toBeNull();
    expect(safeUrl("\u0001javascript:alert(1)")).toBeNull();
    expect(safeUrl("HTTPS://x.y")).toBe("HTTPS://x.y");
    expect(safeUrl("mailto:a@b.co", { images: true })).toBeNull();
    expect(safeUrl("")).toBeNull();
  });
});
