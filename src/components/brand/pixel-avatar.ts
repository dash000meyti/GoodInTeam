import { layoutFromGrid, type PixelCell, type PixelTone } from "./pixel-font";

/**
 * The "virtual me" sprite (spec §4.3, D20): a 16×16 figure with a yellow
 * hoodie. Tones: `k` ink, `f` face, `e` eyes, `y` hoodie. It is painted with
 * the literal AVATAR_FILLS in both modes (never re-toned), faces its direction
 * of travel and is never mirrored. Pure data + `composeAvatar`.
 */

export const AVATAR_SIZE = 16;

export const AVATAR_TONES = {
  k: "ink",
  f: "face",
  e: "eye",
  y: "accent",
} as const satisfies Record<string, PixelTone>;

/** The reference idle frame with every part shown (r0 is empty). */
export const AVATAR_REFERENCE: readonly string[] = [
  "................",
  ".....kkkkkk.....",
  "....kkkkkkkk....",
  "...kkkkkkkkkk...",
  "...kkffffffkk...",
  "...kffffffffk...",
  "...kfeffffefk...",
  "...kffffffffk...",
  "...kfffeefffk...",
  "....kffffffk....",
  ".....kkkkkk.....",
  "....yyyyyyyy....",
  "...yyyyyyyyyy...",
  "..yyyyyyyyyyyy..",
  "..yyy.yyyy.yyy..",
  "....kk....kk....",
];

/**
 * The reference frame with the variable cells neutralised: eyes (x 5, 10 on
 * r6) and mouth (x 7–8 on r8) become face, r15 (feet) is empty.
 */
export const AVATAR_BASE: readonly string[] = AVATAR_REFERENCE.map((row, y) => {
  if (y === 6 || y === 8) return row.replaceAll("e", "f");
  if (y === 15) return ".".repeat(AVATAR_SIZE);
  return row;
});

export type AvatarPart =
  | "eyes"
  | "mouth"
  | "mouthTalk"
  | "armsLap"
  | "feetIdle"
  | "feetA"
  | "feetB"
  | "feetSit"
  | "waveFace"
  | "waveSleeve";

const cells = (tone: PixelTone, xy: readonly (readonly [number, number])[]): PixelCell[] =>
  xy.map(([x, y]) => ({ x, y, tone }));
const run = (x0: number, x1: number, y: number) =>
  Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y] as const);

/** Each part is a delta of one tone, drawn over the base. */
export const AVATAR_PARTS: Record<AvatarPart, PixelCell[]> = {
  eyes: cells("eye", [
    [5, 6],
    [10, 6],
  ]),
  mouth: cells("eye", [
    [7, 8],
    [8, 8],
  ]),
  mouthTalk: cells("eye", [...run(6, 9, 8), ...run(7, 8, 9)]),
  armsLap: cells("accent", [
    [5, 14],
    [10, 14],
  ]),
  feetIdle: cells("ink", [
    [4, 15],
    [5, 15],
    [10, 15],
    [11, 15],
  ]),
  feetA: cells("ink", [
    [3, 15],
    [4, 15],
    [11, 15],
    [12, 15],
  ]),
  feetB: cells("ink", [
    [5, 15],
    [6, 15],
    [9, 15],
    [10, 15],
  ]),
  feetSit: cells("ink", [...run(2, 5, 15), ...run(10, 13, 15)]),
  waveFace: cells("face", [
    [14, 8],
    [14, 9],
  ]),
  waveSleeve: cells("accent", [
    [13, 10],
    [13, 11],
  ]),
};

export const avatarPartNames = Object.keys(AVATAR_PARTS) as AvatarPart[];

export type PixelPose = "idle" | "blink" | "talk" | "walkA" | "walkB" | "wave" | "sit";

export const AVATAR_POSES: Record<PixelPose, AvatarPart[]> = {
  idle: ["eyes", "mouth", "feetIdle"],
  blink: ["mouth", "feetIdle"],
  talk: ["eyes", "mouthTalk", "feetIdle"],
  walkA: ["eyes", "mouth", "feetA"],
  walkB: ["eyes", "mouth", "feetB"],
  wave: ["eyes", "mouth", "feetIdle", "waveFace", "waveSleeve"],
  sit: ["eyes", "mouth", "armsLap", "feetSit"],
};

/** The crop used by `PixelAvatar part="head"` (menu-bar extra, panel Me tile). */
export const AVATAR_HEAD = { x: 3, y: 1, w: 10, h: 10 } as const;

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
