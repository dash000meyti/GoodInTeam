import {
  AVATAR_ICON,
  AVATAR_PARTS,
  AVATAR_SIZE,
  avatarBaseCells,
  avatarIconCells,
  composeAvatar,
  type AvatarPart,
  type PixelPose,
} from "./pixel-avatar";
import {
  GLYPH_HEIGHT,
  layoutFromGrid,
  pixelText,
  pixelTextWidth,
  toPaths,
  toPixelText,
  type PixelCell,
  type PixelTone,
} from "./pixel-font";
import { ICON_TONES, pixelIcons, type PixelIconName } from "./pixel-icons";
import { AVATAR_FILLS, PixelSvg, TONE_FILLS, TonePaths, type PixelCellSize } from "./pixel-svg";

/**
 * Pixel text, icons and the avatar (spec §4.2). Server-safe, no hooks.
 * Every root is `<svg class="px-art">`; text and icons use the variable
 * TONE_FILLS, the avatar the literal AVATAR_FILLS.
 */

/** Latin pixel text (paths, window bars, frame strips). Always aria-hidden, LTR, one path. */
export function PixelText({
  text,
  cell,
  tone = "ink",
  className,
}: {
  text: string;
  cell?: PixelCellSize;
  tone?: PixelTone;
  className?: string;
}) {
  const word = toPixelText(text);
  const d = toPaths(pixelText(word, 0, 0, tone))[tone] ?? "";
  return (
    <PixelSvg w={pixelTextWidth(word)} h={GLYPH_HEIGHT} cell={cell} className={className} dir="ltr">
      <path d={d} style={{ fill: TONE_FILLS[tone] }} />
    </PixelSvg>
  );
}

/**
 * Several Latin strings in ONE `<svg class="px-art px-set">`, one
 * `<path data-path-id>` per item, as wide as the widest item (swapping items
 * never changes its size). `pixel.css` shows only the first item; a consumer
 * swaps with its own `:has()` rules on `.px-set>[data-path-id=…]` (zero JS).
 */
export function PixelTextSet({
  items,
  cell,
  tone = "ink",
  className,
}: {
  items: readonly { id: string; text: string }[];
  cell?: PixelCellSize;
  tone?: PixelTone;
  className?: string;
}) {
  const words = items.map((i) => ({ id: i.id, word: toPixelText(i.text) }));
  const w = Math.max(0, ...words.map((i) => pixelTextWidth(i.word)));
  return (
    <PixelSvg
      w={w}
      h={GLYPH_HEIGHT}
      cell={cell}
      className={["px-set", className].filter(Boolean).join(" ")}
      dir="ltr"
    >
      {words.map((i) => (
        <path
          key={i.id}
          data-path-id={i.id}
          d={toPaths(pixelText(i.word, 0, 0, tone))[tone] ?? ""}
          style={{ fill: TONE_FILLS[tone] }}
        />
      ))}
    </PixelSvg>
  );
}

/**
 * 12×12 icon (≤3 elements). `mirror` adds the literal `rtl:-scale-x-100` for
 * directional icons (only `arrow`), so the art points to inline-end in both
 * directions. The root carries `px-icon`: in forced colours `pixel.css` paints
 * both tones CanvasText (the browser keeps SVG fills, but turns tiles to Canvas).
 */
export function PixelIcon({
  name,
  cell = 2,
  mirror,
  className,
}: {
  name: PixelIconName;
  cell?: PixelCellSize;
  mirror?: boolean;
  className?: string;
}) {
  const layout = layoutFromGrid(pixelIcons[name], ICON_TONES);
  return (
    <PixelSvg
      w={layout.width}
      h={layout.height}
      cell={cell}
      className={["px-icon", mirror && "rtl:-scale-x-100", className].filter(Boolean).join(" ")}
    >
      <TonePaths paths={toPaths(layout.cells)} />
    </PixelSvg>
  );
}

function AvatarPaths({ cells }: { cells: readonly PixelCell[] }) {
  return (
    <>
      {(Object.entries(toPaths(cells)) as [keyof typeof AVATAR_FILLS, string][]).map(
        ([tone, d]) => (
          <path key={tone} d={d} fill={AVATAR_FILLS[tone]} />
        ),
      )}
    </>
  );
}

/**
 * The "virtual me" as one static frame (≤4 elements). `part="head"` draws the
 * 10×10 AVATAR_ICON (the framed screen without limbs, eyes centred): the site
 * menu-bar extra, the panel guide and the Me tile use it at `cell={2}` (20px).
 * Decorative (aria-hidden).
 */
export function PixelAvatar({
  pose = "idle",
  part = "full",
  cell,
  className,
}: {
  pose?: PixelPose;
  part?: "full" | "head";
  cell?: PixelCellSize;
  className?: string;
}) {
  if (part === "head") {
    const size = AVATAR_ICON.length;
    return (
      <PixelSvg w={size} h={size} cell={cell} className={className}>
        <AvatarPaths cells={avatarIconCells()} />
      </PixelSvg>
    );
  }
  return (
    <PixelSvg w={AVATAR_SIZE} h={AVATAR_SIZE} cell={cell} className={className}>
      <AvatarPaths cells={composeAvatar(pose)} />
    </PixelSvg>
  );
}

export type SpriteState = "idle" | "walk" | "talk" | "wave" | "sit";

const SPRITE_PARTS: AvatarPart[] = [
  "eyes",
  "mouthTalk",
  "armR",
  "wave",
  "feetIdle",
  "feetA",
  "feetB",
  "feetSit",
];

function PartPath({ part, className }: { part: AvatarPart; className?: string }) {
  const cells = AVATAR_PARTS[part];
  const tone = cells[0]!.tone as keyof typeof AVATAR_FILLS;
  return <path className={className} d={toPaths(cells)[tone] ?? ""} fill={AVATAR_FILLS[tone]} />;
}

/**
 * The animated sprite for the guide: the base tones plus every variable part
 * as its own element (`.px-p-eyes`, `.px-p-mouthTalk`, `.px-p-wave`, …),
 * switched by `pixel.css` rules keyed ONLY on this root's `data-state`. The
 * guide engine writes every state change to `#gt-guide svg.px-sprite`; the
 * prop sets the first frame. `cell` has no default: without it the size comes
 * from an inherited `--cell` (guide.css sets it on the sprite button).
 */
export function PixelAvatarSprite({
  cell,
  state = "idle",
  className,
}: {
  cell?: PixelCellSize;
  state?: SpriteState;
  className?: string;
}) {
  return (
    <PixelSvg
      w={AVATAR_SIZE}
      h={AVATAR_SIZE}
      cell={cell}
      className={["px-sprite", className].filter(Boolean).join(" ")}
      data-state={state}
    >
      <AvatarPaths cells={avatarBaseCells()} />
      {SPRITE_PARTS.map((p) => (
        <PartPath key={p} part={p} className={`px-p-${p}`} />
      ))}
    </PixelSvg>
  );
}
