import { layoutFromGrid, type PixelCell, type PixelTone } from "./pixel-font";

/**
 * The GoodInBot sprite (spec §4.3, D20; the owner's pick "M3", 2026-11-17):
 * a 16×16 screen creature. Its body is a dark screen in the logo's frame (light
 * top and left edge, ink corner, right and bottom edges), with two yellow
 * eyes, stubby ink arms and legs, and a mouth only while it talks. Tones: `O`
 * ink, `F` frame, `D` face (the screen), `Y` accent (eyes, mouth). It is
 * painted with the literal AVATAR_FILLS in both modes (never re-toned), is
 * symmetric apart from the waving arm and is never mirrored. Pure data +
 * `composeAvatar`.
 */

export const AVATAR_SIZE = 16;

export const AVATAR_TONES = {
  O: "ink",
  F: "frame",
  D: "face",
  Y: "accent",
} as const satisfies Record<string, PixelTone>;

/** The reference idle frame with every idle part shown (rows 0–3 stay free for the wave). */
export const AVATAR_REFERENCE: readonly string[] = [
  "................",
  "................",
  "................",
  "................",
  "..OFFFFFFFFFFF..",
  "..FDDDDDDDDDDO..",
  "..FDDDDDDDDDDO..",
  "..FDYYYDDYYYDO..",
  "..FDYYYDDYYYDO..",
  ".OFDYYYDDYYYDOO.",
  "O.FDDDDDDDDDDO.O",
  "..FDDDDDDDDDDO..",
  "..FDDDDDDDDDDO..",
  "..FOOOOOOOOOOO..",
  ".....O....O.....",
  "....OO....OO....",
];

/**
 * The reference frame with the variable cells neutralised: the top two eye
 * rows (r7–r8) become screen, the right arm and the legs (r14–r15) go. The
 * eyes' bottom row stays, so hiding the `eyes` part reads as a blink.
 */
export const AVATAR_BASE: readonly string[] = AVATAR_REFERENCE.map((row, y) => {
  if (y === 7 || y === 8) return row.replaceAll("Y", "D");
  if (y === 9) return `${row.slice(0, 14)}..`;
  if (y === 10) return `${row.slice(0, 14)}..`;
  if (y >= 14) return ".".repeat(AVATAR_SIZE);
  return row;
});

export type AvatarPart =
  "eyes" | "mouthTalk" | "armR" | "wave" | "feetIdle" | "feetA" | "feetB" | "feetSit";

const cells = (tone: PixelTone, xy: readonly (readonly [number, number])[]): PixelCell[] =>
  xy.map(([x, y]) => ({ x, y, tone }));
const run = (x0: number, x1: number, y: number) =>
  Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y] as const);

/** Each part is a delta of one tone, drawn over the base. */
export const AVATAR_PARTS: Record<AvatarPart, PixelCell[]> = {
  eyes: cells("accent", [...run(4, 6, 7), ...run(9, 11, 7), ...run(4, 6, 8), ...run(9, 11, 8)]),
  mouthTalk: cells("accent", run(7, 8, 11)),
  armR: cells("ink", [
    [14, 9],
    [15, 10],
  ]),
  wave: cells("ink", [
    [14, 8],
    [15, 7],
    [15, 6],
  ]),
  feetIdle: cells("ink", [[5, 14], ...run(4, 5, 15), [10, 14], ...run(10, 11, 15)]),
  feetA: cells("ink", [[4, 14], ...run(3, 4, 15), [11, 14], ...run(11, 12, 15)]),
  feetB: cells("ink", [[6, 14], ...run(6, 7, 15), [9, 14], ...run(8, 9, 15)]),
  feetSit: cells("ink", [[5, 14], ...run(2, 5, 15), [10, 14], ...run(10, 13, 15)]),
};

export const avatarPartNames = Object.keys(AVATAR_PARTS) as AvatarPart[];

export type PixelPose = "idle" | "blink" | "talk" | "walkA" | "walkB" | "wave" | "sit";

export const AVATAR_POSES: Record<PixelPose, AvatarPart[]> = {
  idle: ["eyes", "armR", "feetIdle"],
  blink: ["armR", "feetIdle"],
  talk: ["eyes", "mouthTalk", "armR", "feetIdle"],
  walkA: ["eyes", "armR", "feetA"],
  walkB: ["eyes", "armR", "feetB"],
  wave: ["eyes", "wave", "feetIdle"],
  sit: ["eyes", "armR", "feetSit"],
};

/**
 * The 10×10 icon for small sizes (`PixelAvatar part="head"`: the site menu-bar
 * extra, the panel guide button and Me tile at `cell={2}` = 20px): the framed
 * screen alone, no limbs, eyes centred.
 */
export const AVATAR_ICON: readonly string[] = [
  "OFFFFFFFFF",
  "FDDDDDDDDO",
  "FDDDDDDDDO",
  "FDYYDDYYDO",
  "FDYYDDYYDO",
  "FDYYDDYYDO",
  "FDDDDDDDDO",
  "FDDDDDDDDO",
  "FDDDDDDDDO",
  "FOOOOOOOOO",
];

/** Icon cells. */
export function avatarIconCells(): PixelCell[] {
  return layoutFromGrid(AVATAR_ICON, AVATAR_TONES).cells;
}

/** Base cells (no variable parts). */
export function avatarBaseCells(): PixelCell[] {
  return layoutFromGrid(AVATAR_BASE, AVATAR_TONES).cells;
}

/** Base + the pose's parts; later parts win per cell. Pure. */
export function composeAvatar(pose: PixelPose): PixelCell[] {
  const grid = new Map<string, PixelCell>();
  for (const c of avatarBaseCells()) grid.set(`${c.x}:${c.y}`, c);
  for (const part of AVATAR_POSES[pose])
    for (const c of AVATAR_PARTS[part]) grid.set(`${c.x}:${c.y}`, c);
  return [...grid.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}
