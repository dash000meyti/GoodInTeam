import { describe, expect, it } from "vitest";
import {
  AVATAR_BASE,
  AVATAR_ICON,
  AVATAR_PARTS,
  AVATAR_POSES,
  AVATAR_REFERENCE,
  AVATAR_SIZE,
  AVATAR_TONES,
  avatarIconCells,
  composeAvatar,
  type PixelPose,
} from "./pixel-avatar";

const toneChar = Object.fromEntries(Object.entries(AVATAR_TONES).map(([ch, t]) => [t, ch]));

function render(pose: PixelPose) {
  const grid = Array.from({ length: AVATAR_SIZE }, () => Array(AVATAR_SIZE).fill("."));
  for (const c of composeAvatar(pose)) grid[c.y]![c.x] = toneChar[c.tone];
  return grid.map((r) => r.join(""));
}

describe("pixel avatar (M3 screen creature)", () => {
  it("reference, base and every part fit in 16×16", () => {
    for (const g of [AVATAR_REFERENCE, AVATAR_BASE]) {
      expect(g).toHaveLength(16);
      for (const r of g) expect(r).toHaveLength(16);
    }
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

  it("the body wears the logo frame: ink corner, light top and left, ink right and bottom", () => {
    expect(AVATAR_REFERENCE[4]).toBe("..OFFFFFFFFFFF..");
    expect(AVATAR_REFERENCE[13]).toBe("..FOOOOOOOOOOO..");
    for (let y = 5; y <= 12; y++) {
      expect(AVATAR_REFERENCE[y]![2], `r${y}`).toBe("F");
      expect(AVATAR_REFERENCE[y]![13], `r${y}`).toBe("O");
    }
  });

  it("the base keeps the eyes' bottom row and drops the variable cells", () => {
    expect(AVATAR_BASE[7]).toBe("..FDDDDDDDDDDO..");
    expect(AVATAR_BASE[8]).toBe("..FDDDDDDDDDDO..");
    expect(AVATAR_BASE[9]).toBe(".OFDYYYDDYYYDO..");
    expect(AVATAR_BASE[14]).toBe(".".repeat(16));
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

  it("blink closes the eyes, talk opens a mouth, wave raises the arm", () => {
    expect(render("blink")[7]).toBe("..FDDDDDDDDDDO..");
    expect(render("blink")[9]).toBe(".OFDYYYDDYYYDOO.");
    expect(render("idle")[11]).toBe("..FDDDDDDDDDDO..");
    expect(render("talk")[11]).toBe("..FDDDDYYDDDDO..");
    expect(render("wave")[6]![15]).toBe("O");
    expect(render("wave")[10]![15]).toBe(".");
    expect(render("sit")[15]).toBe("..OOOO....OOOO..");
  });

  it("the small icon is a leg-free framed square with centred eyes", () => {
    expect(AVATAR_ICON).toHaveLength(10);
    for (const r of AVATAR_ICON) expect(r).toHaveLength(10);
    const eyeRows = AVATAR_ICON.flatMap((r, y) => (r.includes("Y") ? [y] : []));
    expect(eyeRows).toEqual([3, 4, 5]);
    expect(AVATAR_ICON[9]).toBe("FOOOOOOOOO");
    expect(new Set(avatarIconCells().map((c) => c.tone))).toEqual(
      new Set(["ink", "frame", "face", "accent"]),
    );
  });
});
