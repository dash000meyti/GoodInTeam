import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PixelAvatar, PixelAvatarSprite, PixelIcon, PixelText, PixelTextSet } from "./pixel-art";
import { PixelLogo, PixelLogoCycle, PixelLogoSwap, PixelMark } from "./pixel-logo";
import { pixelIconNames } from "./pixel-icons";
import { LogoMark } from "./logo";

const html = (el: ReactElement) => renderToStaticMarkup(el);
/** svg + g + path + rect elements (the §4.2 budget unit). */
const count = (markup: string) => (markup.match(/<(svg|g|path|rect)\b/g) ?? []).length;

describe("pixel components (element budgets, spec §4.2)", () => {
  it("logo, mark, cycle and swap", () => {
    expect(count(html(createElement(PixelMark)))).toBe(6);
    expect(count(html(createElement(PixelLogo)))).toBe(7);
    expect(count(html(createElement(PixelLogo, { paper: false })))).toBe(6);
    expect(count(html(createElement(PixelLogoCycle)))).toBe(12);
    expect(count(html(createElement(PixelLogoSwap, { id: "x" })))).toBe(12);
  });

  it("text, text sets, icons and avatars", () => {
    expect(count(html(createElement(PixelText, { text: "01" })))).toBe(2);
    const set = html(
      createElement(PixelTextSet, {
        items: ["PORTAL", "PROGRESS", "CONTRACTS", "INVOICES"].map((t) => ({ id: t, text: t })),
      }),
    );
    expect(count(set)).toBe(5);
    expect(set).toContain('class="px-art px-set"');
    expect(set).toContain('data-path-id="PROGRESS"');
    for (const name of pixelIconNames)
      expect(count(html(createElement(PixelIcon, { name }))), name).toBeLessThanOrEqual(3);
    expect(count(html(createElement(PixelAvatar)))).toBeLessThanOrEqual(5);
    expect(count(html(createElement(PixelAvatar, { part: "head" })))).toBe(4);
    expect(count(html(createElement(PixelAvatarSprite)))).toBeLessThanOrEqual(16);
  });

  it("every root is svg.px-art with crisp edges and integer cell classes", () => {
    const m = html(createElement(PixelMark, { cell: 2 }));
    expect(m).toMatch(/^<svg[^>]*class="px-art \[--cell:2px\]"/);
    expect(m).toContain('shape-rendering="crispEdges"');
    expect(m).toContain("--px-w:11;--px-h:11");
    // no cell → no class, the size comes from an inherited --cell
    expect(html(createElement(PixelAvatarSprite))).toMatch(/^<svg[^>]*class="px-art px-sprite"/);
    expect(html(createElement(LogoMark))).toContain("[--cell:3px]");
  });

  it("the sprite exposes its state on its own root and every part", () => {
    const s = html(createElement(PixelAvatarSprite, { state: "walk" }));
    expect(s).toMatch(/^<svg[^>]*data-state="walk"/);
    for (const p of [
      "eyes",
      "mouth",
      "mouthTalk",
      "armsLap",
      "feetIdle",
      "feetA",
      "feetB",
      "feetSit",
      "wave",
    ])
      expect(s, p).toContain(`class="px-p-${p}"`);
  });

  it("the avatar paints with literal fills, never variables", () => {
    for (const el of [
      createElement(PixelAvatar, { pose: "wave" }),
      createElement(PixelAvatarSprite),
    ]) {
      const s = html(el);
      expect(s).not.toContain("var(");
      expect(s).toContain('fill="#FFC50D"');
    }
  });

  it("Persian digits render inside the one text path, LTR", () => {
    const fa = html(createElement(PixelText, { text: "۰۳", cell: 2 }));
    expect(count(fa)).toBe(2);
    expect(fa).toContain('dir="ltr"');
    expect(fa).toContain("--px-w:11;--px-h:7");
    expect(fa).toMatch(/<path d="M\d/);
  });

  it("icons are marked px-icon (forced colours) and panel icons stay ≤3 elements", () => {
    for (const name of pixelIconNames) {
      const s = html(createElement(PixelIcon, { name }));
      expect(s, name).toMatch(/^<svg[^>]*class="px-art \[--cell:2px\] px-icon/);
      expect((s.match(/<path\b/g) ?? []).length, name).toBeLessThanOrEqual(2);
    }
  });

  it("the cycle marks itself for play and the arrow mirrors only when asked", () => {
    expect(html(createElement(PixelLogoCycle))).toContain('data-play=""');
    expect(html(createElement(PixelLogoCycle, { play: false }))).not.toContain("data-play");
    expect(html(createElement(PixelIcon, { name: "arrow", mirror: true }))).toContain(
      "rtl:-scale-x-100",
    );
    expect(html(createElement(PixelIcon, { name: "arrow" }))).not.toContain("rtl:");
  });
});
