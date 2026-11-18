import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { ALLOWED_TAGS, sanitizeContentHtml, sanitizeMarkdownHtml } = await import("./html-sanitize");
const { renderMarkdown } = await import("./markdown");

const published = async (md: string) => (await renderMarkdown(md, { allowHtml: true })).html;

/** No element that can run or load script, no handler attribute, no script-capable URL. */
function expectInert(html: string) {
  const lower = html.toLowerCase();
  expect(lower).not.toMatch(
    /<\s*(script|style|object|embed|form|button|svg|math|link|meta|base)\b/,
  );
  expect(lower).not.toMatch(/<[^>]*\son[a-z]+\s*=/);
  expect(lower).not.toMatch(
    /(href|src|srcset|poster|action|formaction|xlink:href)\s*=\s*["']?\s*(javascript|vbscript|data):/,
  );
  expect(lower).not.toMatch(/srcdoc\s*=/);
}

describe("published HTML is sanitised", () => {
  it.each([
    "<script>alert(1)</script>",
    '<script src="https://evil.example/x.js"></script>',
    '<img src=x onerror="alert(1)">',
    "<img src=x onerror=alert(1)>",
    '<svg onload="alert(1)"><circle r="1"/></svg>',
    "<svg><script>alert(1)</script></svg>",
    '<a href="javascript:alert(1)">x</a>',
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<a href=" \tjava\nscript:alert(1)">x</a>',
    '<a href="&#106;avascript:alert(1)">x</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>',
    '<img src="data:image/svg+xml;base64,PHN2Zz4=">',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<iframe src="https://evil.example/embed/abcdefgh"></iframe>',
    '<object data="https://evil.example/x.swf"></object>',
    '<embed src="https://evil.example/x.swf">',
    '<form action="https://evil.example"><input name="password"><button>Sign in</button></form>',
    '<div style="position:fixed;inset:0;background:url(javascript:alert(1))">x</div>',
    '<p onclick="alert(1)" onmouseover="alert(2)">x</p>',
    '<details ontoggle="alert(1)" open><summary>x</summary></details>',
    '<video src="x" onloadstart="alert(1)"></video>',
    '<video poster="javascript:alert(1)"></video>',
    '<img srcset="javascript:alert(1) 1x, /ok.png 2x">',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    '<link rel="stylesheet" href="https://evil.example/x.css">',
    '<base href="https://evil.example/">',
    "<style>body{display:none}</style>",
    "<math><mtext><style><img src=x onerror=alert(1)></style></mtext></math>",
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
    "<textarea></textarea><img src=x onerror=alert(1)>",
    "<![CDATA[<img src=x onerror=alert(1)>]]>",
    '<a href="https://example.com" target="_top" rel="opener">x</a>',
  ])("makes %s inert", async (payload) => {
    expectInert(sanitizeContentHtml(payload));
    // …and the same through the Markdown renderer, as a block and inline.
    expectInert(await published(payload));
    expectInert(await published(`Text ${payload} more text.`));
    expectInert(await published(`# Title\n\n- item ${payload}\n\n> quote ${payload}`));
  });

  it("removes script and style together with their content", async () => {
    const html = await published("Hello.\n\n<script>window.x = 1</script>\n\n<style>p{}</style>");
    expect(html).toContain("<p>Hello.</p>");
    expect(html).not.toContain("window.x");
    expect(html).not.toContain("p{}");
  });

  it("keeps text and layout markup", async () => {
    const html = await published(
      [
        "<details open><summary>More</summary>",
        "",
        "Inside **bold**.",
        "",
        "</details>",
        "",
        '<figure><img src="/media/abc/a.png" alt="A" width="640" height="360" loading="lazy"><figcaption>Caption</figcaption></figure>',
        "",
        'Press <kbd>Ctrl</kbd> + <kbd>K</kbd>, H<sub>2</sub>O, x<sup>2</sup>, <mark>marked</mark>, <abbr title="Hyper Text">HT</abbr>.',
        "",
        '<div dir="ltr" lang="en"><p>Left to right</p></div>',
        "",
        '<table><thead><tr><th scope="col" colspan="2">H</th></tr></thead><tbody><tr><td align="center">a</td><td rowspan="1">b</td></tr></tbody></table>',
      ].join("\n"),
    );
    for (const kept of [
      "<details open>",
      "<summary>More</summary>",
      "<strong>bold</strong>",
      "<figure>",
      '<img src="/media/abc/a.png" alt="A" width="640" height="360" loading="lazy" />',
      "<figcaption>Caption</figcaption>",
      "<kbd>Ctrl</kbd>",
      "H<sub>2</sub>O",
      "x<sup>2</sup>",
      "<mark>marked</mark>",
      '<abbr title="Hyper Text">HT</abbr>',
      '<div dir="ltr" lang="en">',
      '<th scope="col" colspan="2">H</th>',
      '<td align="center">a</td>',
    ])
      expect(html).toContain(kept);
  });

  it("keeps media from http(s) and site-relative sources only", async () => {
    const html = await published(
      [
        '<video src="/media/abc/clip.mp4" poster="https://cdn.example/p.jpg" controls muted playsinline></video>',
        '<audio src="https://cdn.example/a.mp3" controls></audio>',
        '<picture><source srcset="/media/abc/a.avif 1x, /media/abc/a2.avif 2x" type="image/avif"><img src="/media/abc/a.png" alt=""></picture>',
        '<video src="ftp://example.com/v.mp4"></video>',
        '<img src="mailto:a@b.co">',
      ].join("\n\n"),
    );
    expect(html).toContain(
      '<video src="/media/abc/clip.mp4" poster="https://cdn.example/p.jpg" controls muted playsinline></video>',
    );
    expect(html).toContain('<audio src="https://cdn.example/a.mp3" controls></audio>');
    expect(html).toContain('srcset="/media/abc/a.avif 1x, /media/abc/a2.avif 2x"');
    expect(html).toContain('<img src="/media/abc/a.png" alt="" />');
    expect(html).not.toContain("ftp:");
    expect(html).not.toContain("mailto:");
  });

  it("keeps links with the renderer's schemes and never hands out the opener", async () => {
    const html = await published(
      '<a href="https://example.com" target="_blank">w</a> <a href="mailto:a@b.co">m</a> <a href="tel:+98912">t</a> <a href="/blog/x" rel="nofollow opener">r</a> <a href="ftp://x.example/f">f</a>',
    );
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">w</a>',
    );
    expect(html).toContain('<a href="mailto:a@b.co">m</a>');
    expect(html).toContain('<a href="tel:+98912">t</a>');
    expect(html).toContain('<a href="/blog/x" rel="nofollow">r</a>');
    expect(html).toContain("<a>f</a>");
  });

  it("allows an iframe only as the site's video embed", async () => {
    const ok = await published(
      '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" width="560" height="315" allow="camera; microphone" allowfullscreen onload="alert(1)"></iframe>',
    );
    expect(ok).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0"');
    expect(ok).toContain('width="560" height="315"');
    expect(ok).toContain("allowfullscreen");
    // The feature list is the site's own, never the author's.
    expect(ok).not.toMatch(/camera|microphone|onload/);
    expect(ok).toContain('referrerpolicy="strict-origin-when-cross-origin"');

    for (const src of [
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com.evil.example/embed/dQw4w9WgXcQ",
      "https://evil.example/www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "http://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "//www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "/embed/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/../watch",
    ]) {
      expect(await published(`<iframe src="${src}"></iframe>`), src).not.toContain("<iframe");
    }
  });

  it("gives the author no classes, ids, styles or data attributes", async () => {
    const html = await published(
      '<div class="fixed inset-0 z-50" id="app" style="position:fixed" data-guide-say="x" name="y">x</div>\n\n<span class="line fixed" style="color:#fff;position:fixed;background:url(https://evil.example/x)">y</span>',
    );
    expect(html).toContain("<div>x</div>");
    // On the highlighter's own elements only its own classes and colours pass.
    expect(html).toContain('<span class="line" style="color:#fff">y</span>');
  });

  it("keeps task lists as disabled checkboxes and drops any other input", async () => {
    const html = await published(
      '- [x] done\n- [ ] todo\n\n<input type="text" name="q"><input type="checkbox">',
    );
    expect(html.match(/<input [^>]*type="checkbox"[^>]*\/>/g)).toHaveLength(2);
    expect(html.match(/<input /g)).toHaveLength(2);
    expect(html).toMatch(/<input checked disabled type="checkbox" \/>/);
    expect(html).not.toContain('name="q"');
  });

  it("leaves the renderer's own output as it was", async () => {
    // Headings, links, images, tables and every highlighted token keep their
    // attributes: sanitising Markdown without raw HTML changes no style or class.
    const md = [
      "# Title here",
      "## سلام دنیا",
      '[w](https://example.com) and ![i](/media/1/a.png "T")',
      "| a | b |\n| :-: | --: |\n| 1 | 2 |",
      "```ts\nexport const a: Record<string, number> = { x: 1 }; // comment\n```",
      "```md\n# h\n**bold** _italic_ ~~gone~~ [l](x)\n```",
      '```html\n<a href="x" onclick="y()">z</a>\n```',
      "```diff\n- a\n+ b\n```",
      "```unknown\nplain <b>text</b>\n```",
    ].join("\n\n");
    const plain = (await renderMarkdown(md)).html;
    const safe = (await renderMarkdown(md, { allowHtml: true })).html;
    const attrs = (html: string, name: string) =>
      [...html.matchAll(new RegExp(` ${name}="([^"]*)"`, "g"))].map((m) => m[1]);
    for (const name of [
      "style",
      "class",
      "id",
      "href",
      "src",
      "align",
      "target",
      "rel",
      "tabindex",
    ]) {
      expect(attrs(safe, name), name).toEqual(attrs(plain, name));
    }
    expect(attrs(safe, "style").length).toBeGreaterThan(10);
    // Same text; only the spelling of `<` and `>` as entities may differ.
    const text = (html: string) =>
      html
        .replace(/<[^>]+>/g, "")
        .replace(/&#x3C;/g, "&lt;")
        .replace(/&gt;/g, ">");
    expect(text(safe)).toBe(text(plain));
  });

  it("allows only the documented elements", () => {
    for (const tag of [
      "script",
      "style",
      "form",
      "button",
      "select",
      "textarea",
      "object",
      "embed",
      "svg",
      "math",
      "link",
      "meta",
      "base",
      "template",
      "noscript",
      "frame",
      "frameset",
      "applet",
      "marquee",
    ]) {
      expect(ALLOWED_TAGS, tag).not.toContain(tag);
    }
  });
});

describe("Markdown mirrors carry the sanitised source", () => {
  it("returns Markdown without HTML unchanged", () => {
    const md =
      "# Title\n\n> quote\n\n- a\n- b\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n[x](/y) `code` 1 > 0\n";
    expect(sanitizeMarkdownHtml(md)).toBe(md);
  });

  it("keeps allow-listed tags and cleans their attributes", () => {
    const out = sanitizeMarkdownHtml(
      '<details open ontoggle="alert(1)"><summary>More</summary>\n\nInside **bold**.\n\n</details>\n\nPress <kbd class="x">K</kbd> <a href="javascript:alert(1)" onclick="x()">link</a> <img src=x onerror=alert(1)><br>\n',
    );
    expect(out).toContain("<details open><summary>More</summary>");
    expect(out).toContain("Inside **bold**.");
    expect(out).toContain("</details>");
    expect(out).toContain("<kbd>K</kbd>");
    expect(out).toContain("<a>link</a>");
    expect(out).toContain('<img src="x" />');
    expect(out).toContain("<br />");
    expect(out).not.toMatch(/onerror|onclick|ontoggle|javascript:/);
  });

  it("turns every other tag into text", () => {
    const out = sanitizeMarkdownHtml(
      'A <script>alert(1)</script> b.\n\n<script src="x"></script>\n\n<iframe src="https://evil.example"></iframe>\n\n<svg onload=alert(1)>\n\nArray<string> and a <b title="<script>">c</b>\n',
    );
    expect(out).not.toMatch(/<\/?(script|svg)/i);
    expect(out).not.toContain("<iframe");
    expect(out).toContain("&lt;script>alert(1)&lt;/script>");
    expect(out).toContain("Array&lt;string>");
    expect(out).toContain('<b title="&lt;script&gt;">c</b>');
  });

  it("leaves no way to start a tag outside code", () => {
    const payloads = [
      "<script>alert(1)</script>",
      "<img src=x onerror=alert(1)>",
      "<img/src=x/onerror=alert(1)>",
      "<svg/onload=alert(1)>",
      "<a href=javascript:alert(1)>x</a>",
      "<scr<script>ipt>alert(1)</scr</script>ipt>",
      "<scr<!-- -->ipt>alert(1)</script>",
      "<<script>alert(1)</script>",
      "\\<script>alert(1)</script>",
      "\\\\<script>alert(1)</script>",
      "<script\n>alert(1)</script\n>",
      "<img src=x onerror=alert(1)",
      "<!--><script>alert(1)</script>-->",
      "<![CDATA[<script>alert(1)</script>]]>",
      "<?php echo 1 ?><script>alert(1)</script>",
      "<kbd>`<img src=x onerror=alert(1)>`</kbd> and `<img src=x onerror=alert(1)>`",
      '[x](/u "`<img src=x onerror=alert(1)>`") `<img src=x onerror=alert(1)>`',
    ];
    const contexts = [
      (p: string) => p,
      (p: string) => `Text ${p} text.`,
      (p: string) => `- item ${p}\n  continued ${p}\n- next`,
      (p: string) => `> quote ${p}\n> more ${p}`,
      (p: string) => `| a | b |\n| - | - |\n| ${p.replace(/\n/g, " ")} | x |`,
      (p: string) => `<div>\n${p}\n</div>`,
      (p: string) => `# Heading ${p.replace(/\n/g, " ")}`,
    ];
    for (const payload of payloads) {
      for (const wrap of contexts) {
        const out = sanitizeMarkdownHtml(wrap(payload));
        // Outside inline code, every `<` starts an allow-listed tag.
        const outsideCode = out.replace(/`[^`\n]*`/g, "");
        for (const m of outsideCode.matchAll(/<\/?([A-Za-z!?[][^\s>/]*)?/g)) {
          expect(ALLOWED_TAGS, `${JSON.stringify(m[0])} in ${JSON.stringify(out)}`).toContain(
            (m[1] ?? "").toLowerCase(),
          );
        }
        expect(outsideCode.toLowerCase(), out).not.toMatch(/<[^>]*\son[a-z]+\s*=/);
      }
    }
  });

  it("does not keep an HTML context as code because the same text is inline code later", () => {
    const code = "`<img src=x onerror=alert(1)>`";
    // The first copy is the value of an attribute, the second is inline code.
    const out = sanitizeMarkdownHtml(`<a title="${code}">x</a> and ${code}\n`);
    expect(out).toBe(`<a title="\`&lt;img src=x onerror=alert(1)&gt;\`">x</a> and ${code}\n`);
    // An HTML block is not Markdown: backticks inside it do not make code.
    const block = sanitizeMarkdownHtml(`<div>\n${code}\n</div>\n\nText ${code}\n`);
    expect(block).toBe(`<div>\n\`<img src="x" />\`\n</div>\n\nText ${code}\n`);
  });

  it("keeps code, autolinks, link targets and comparisons readable", () => {
    const md = [
      "Inline `<script>alert(1)</script>` and `Array<string>`.",
      "```html\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n```",
      "    <b>indented code</b>",
      "<https://example.com/a?b=1> <mailto:a@b.co> <a@b.co> [x](</path with spaces>)",
    ].join("\n\n");
    expect(sanitizeMarkdownHtml(md)).toBe(md);
    expect(sanitizeMarkdownHtml("if a < b and b > c\n")).toBe("if a &lt; b and b > c\n");
    expect(sanitizeMarkdownHtml("a <!-- hidden note --> b\n")).toBe("a  b\n");
  });

  it("keeps code inside lists and quotes as it is", () => {
    const md = [
      "1. Install it:",
      "",
      "   ```tsx",
      '   export const App = () => <div className="app">',
      '     <Child<string> value="x" />',
      "",
      "   >>> not a quote",
      "   </div>;",
      "   ```",
      "",
      "2. Use `Array<string>` here",
      "   and `<b>` on the next line of the same item.",
      "",
      "> A quote with code:",
      ">",
      "> ```html",
      "> <script>shown()</script>",
      "> ```",
      ">",
      "> and `<i>` after it.",
      "",
      "| tag | meaning |",
      "| --- | --- |",
      "| `<b>` | bold |",
      "",
    ].join("\n");
    expect(sanitizeMarkdownHtml(md)).toBe(md);
  });

  it("still cleans raw HTML next to code inside lists and quotes", () => {
    const out = sanitizeMarkdownHtml(
      [
        "- item <script>alert(1)</script> with `<code>` kept",
        "  second line <img src=x onerror=alert(1)> and `<img onerror=x>` kept",
        "",
        "  ```html",
        "  <script>kept()</script>",
        "  ```",
        "",
        "> quote <svg onload=alert(1)>",
        '> more <b onclick="x()">bold</b>',
        "",
      ].join("\n"),
    );
    expect(out).toContain("item &lt;script>alert(1)&lt;/script> with `<code>` kept");
    expect(out).toContain('second line <img src="x" /> and `<img onerror=x>` kept');
    expect(out).toContain("  ```html\n  <script>kept()</script>\n  ```");
    expect(out).toContain("> quote &lt;svg onload=alert(1)>");
    expect(out).toContain("> more <b>bold</b>");
  });

  it("does not take fence-like lines inside raw HTML for code", () => {
    // An HTML block is raw HTML up to its blank line, whatever its lines look like.
    const out = sanitizeMarkdownHtml(
      "<div>\n```\n<script>alert(1)</script>\n```\n</div>\n\n- x\n\n  <div>\n  ```\n  <script>alert(2)</script>\n  ```\n  </div>\n",
    );
    expect(out).not.toMatch(/<script/);
    expect(out.match(/&lt;script>/g)).toHaveLength(2);
  });

  it("stays fast on hostile input", () => {
    const started = performance.now();
    sanitizeMarkdownHtml("<!--".repeat(50_000));
    sanitizeMarkdownHtml('<a b="'.repeat(50_000));
    sanitizeMarkdownHtml(`<a ${"b ".repeat(100_000)}`);
    sanitizeMarkdownHtml("<".repeat(200_000));
    // Many pieces in one block, with and without a place where they can be found.
    sanitizeMarkdownHtml(`- ${"`<a>` <b>x</b> ".repeat(20_000)}\n`);
    sanitizeMarkdownHtml(`> ${"`<a>` <b>x</b>\n> \tfoo <i>\n".repeat(10_000)}`);
    sanitizeMarkdownHtml(`${"- a `<x>`\n  b <y>\n\n  ```\n  <z>\n  ```\n".repeat(5_000)}`);
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it("bounds the work on a document full of different tags", () => {
    const tags = Array.from(
      { length: 30_000 },
      (_, i) => `<b title="t${i}" onclick="x(${i})">x</b>`,
    );
    const started = performance.now();
    const out = sanitizeMarkdownHtml(`${tags.join(" ")}\n`);
    expect(performance.now() - started).toBeLessThan(3_000);
    expect(out).not.toMatch(/onclick/);
    // The first ones keep their (cleaned) attributes; past the budget a tag keeps its name only.
    expect(out).toContain('<b title="t0">x</b>');
    expect(out).toContain("<b>x</b>");
    expect(out.match(/<b[ >]/g)).toHaveLength(30_000);
    // The budget is per document.
    expect(sanitizeMarkdownHtml('<b title="again">x</b>\n')).toBe('<b title="again">x</b>\n');
  });
});
