import { describe, expect, it } from "vitest";
import {
  AVATAR_BASE,
  AVATAR_HEAD,
  AVATAR_PARTS,
  AVATAR_POSES,
  AVATAR_REFERENCE,
  AVATAR_SIZE,
  AVATAR_TONES,
  composeAvatar,
  type PixelPose,
} from "./pixel-avatar";

const toneChar = Object.fromEntries(Object.entries(AVATAR_TONES).map(([ch, t]) => [t, ch]));

function render(pose: PixelPose) {
  const grid = Array.from({ length: AVATAR_SIZE }, () => Array(AVATAR_SIZE).fill("."));
  for (const c of composeAvatar(pose)) grid[c.y]![c.x] = toneChar[c.tone];
  return grid.map((r) => r.join(""));
}

describe("pixel avatar", () => {
  it("base and every part fit in 16×16", () => {
    expect(AVATAR_BASE).toHaveLength(16);
    for (const r of AVATAR_BASE) expect(r).toHaveLength(16);
    for (const [name, cells] of Object.entries(AVATAR_PARTS))
      for (const c of cells) {
        expect(c.x, name).toBeGreaterThanOrEqual(0);
        expect(c.x, name).toBeLessThan(16);
        expect(c.y, name).toBeGreaterThanOrEqual(0);
        expect(c.y, name).toBeLessThan(16);
      }
  });

  it("each part has exactly one tone", () => {
    for (const [name, cells] of Object.entries(AVATAR_PARTS)) {
      expect(cells.length, name).toBeGreaterThan(0);
      expect(new Set(cells.map((c) => c.tone)).size, name).toBe(1);
    }
  });

  it("the base neutralises eyes, mouth and feet", () => {
    expect(AVATAR_BASE[6]).toBe("...kffffffffk...");
    expect(AVATAR_BASE[8]).toBe("...kffffffffk...");
    expect(AVATAR_BASE[15]).toBe(".".repeat(16));
  });

  it("every pose composes to valid tones", () => {
    const valid = new Set<string>(Object.values(AVATAR_TONES));
    for (const pose of Object.keys(AVATAR_POSES) as PixelPose[])
      for (const c of composeAvatar(pose)) expect(valid.has(c.tone), pose).toBe(true);
    expect(Object.keys(AVATAR_POSES).sort()).toEqual(
      ["blink", "idle", "sit", "talk", "walkA", "walkB", "wave"].sort(),
    );
  });

  it("idle equals the reference frame", () => {
    expect(render("idle")).toEqual(AVATAR_REFERENCE);
  });

  it("blink hides the eyes, talk opens the mouth, wave raises a hand", () => {
    expect(render("blink")[6]).toBe("...kffffffffk...");
    expect(render("talk")[8]).toBe("...kffeeeeffk...");
    expect(render("wave")[8]![14]).toBe("f");
    expect(render("sit")[15]).toBe("..kkkk....kkkk..");
  });

  it("the head crop lies inside the grid and has no hoodie cells", () => {
    const { x, y, w, h } = AVATAR_HEAD;
    expect(x + w).toBeLessThanOrEqual(16);
    expect(y + h).toBeLessThanOrEqual(16);
    const head = composeAvatar("idle").filter(
      (c) => c.x >= x && c.x < x + w && c.y >= y && c.y < y + h,
    );
    expect(head.some((c) => c.tone === "accent")).toBe(false);
    expect(head.some((c) => c.tone === "eye")).toBe(true);
  });
});
