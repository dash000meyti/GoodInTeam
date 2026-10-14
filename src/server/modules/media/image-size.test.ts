import { describe, expect, it } from "vitest";
import { imageSize } from "./image-size";

const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(
    parts.flatMap((p) => (typeof p === "string" ? Array.from(p, (c) => c.charCodeAt(0)) : p)),
  );
const u32be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16le = (n: number) => [n & 255, (n >>> 8) & 255];
const u16be = (n: number) => [(n >>> 8) & 255, n & 255];

describe("imageSize", () => {
  it("reads PNG IHDR", () => {
    const png = bytes(
      [0x89],
      "PNG",
      [0x0d, 0x0a, 0x1a, 0x0a],
      u32be(13),
      "IHDR",
      u32be(1600),
      u32be(1000),
      [8, 6, 0, 0, 0],
    );
    expect(imageSize(png)).toEqual({ type: "png", width: 1600, height: 1000 });
  });

  it("reads GIF logical screen", () => {
    const gif = bytes("GIF89a", u16le(320), u16le(200), [0, 0, 0]);
    expect(imageSize(gif)).toEqual({ type: "gif", width: 320, height: 200 });
  });

  it("reads JPEG SOF0 after APP0", () => {
    const app0 = [0xff, 0xe0, ...u16be(16), ...Array(14).fill(0)];
    const sof0 = [
      0xff,
      0xc0,
      ...u16be(17),
      8,
      ...u16be(480),
      ...u16be(640),
      3,
      ...Array(9).fill(0),
    ];
    const jpg = bytes([0xff, 0xd8], app0, sof0, [0xff, 0xd9]);
    expect(imageSize(jpg)).toEqual({ type: "jpeg", width: 640, height: 480 });
  });

  it("reads JPEG progressive (SOF2) and skips DHT", () => {
    const dht = [0xff, 0xc4, ...u16be(4), 0, 0];
    const sof2 = [
      0xff,
      0xc2,
      ...u16be(17),
      8,
      ...u16be(1080),
      ...u16be(1920),
      3,
      ...Array(9).fill(0),
    ];
    const jpg = bytes([0xff, 0xd8], dht, sof2);
    expect(imageSize(jpg)).toEqual({ type: "jpeg", width: 1920, height: 1080 });
  });

  it("reads WebP VP8X (extended)", () => {
    const w = 1200 - 1;
    const h = 630 - 1;
    const webp = bytes(
      "RIFF",
      [0, 0, 0, 0],
      "WEBP",
      "VP8X",
      [10, 0, 0, 0],
      [0, 0, 0, 0],
      [w & 255, (w >> 8) & 255, (w >> 16) & 255],
      [h & 255, (h >> 8) & 255, (h >> 16) & 255],
    );
    expect(imageSize(webp)).toEqual({ type: "webp", width: 1200, height: 630 });
  });

  it("reads WebP VP8 (lossy)", () => {
    const webp = bytes(
      "RIFF",
      [0, 0, 0, 0],
      "WEBP",
      "VP8 ",
      [0, 0, 0, 0],
      [0, 0, 0],
      [0x9d, 0x01, 0x2a],
      u16le(800),
      u16le(600),
      [0, 0],
    );
    expect(imageSize(webp)).toEqual({ type: "webp", width: 800, height: 600 });
  });

  it("reads WebP VP8L (lossless)", () => {
    // width-1 = 99 (14 bits), height-1 = 49 (14 bits)
    const bits = 99 | (49 << 14);
    const webp = bytes(
      "RIFF",
      [0, 0, 0, 0],
      "WEBP",
      "VP8L",
      [0, 0, 0, 0],
      [0x2f],
      [bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >> 24) & 255],
      [0, 0, 0, 0, 0],
    );
    expect(imageSize(webp)).toEqual({ type: "webp", width: 100, height: 50 });
  });

  it("returns null for unknown or truncated data", () => {
    expect(imageSize(bytes("hello world, not an image"))).toBeNull();
    expect(imageSize(bytes([0x89], "PNG"))).toBeNull();
    expect(imageSize(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0, 0, 0]))).toBeNull();
  });
});
