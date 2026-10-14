/**
 * Read image dimensions from file headers (no dependencies, no decoding).
 * Supports PNG, JPEG, WebP (VP8 / VP8L / VP8X) and GIF. Returns null for
 * anything else or truncated data. Pure — see image-size.test.ts.
 */
export interface ImageSize {
  width: number;
  height: number;
  type: "png" | "jpeg" | "webp" | "gif";
}

export function imageSize(buf: Uint8Array): ImageSize | null {
  if (buf.length < 10) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const ascii = (o: number, n: number) => String.fromCharCode(...buf.subarray(o, o + n));

  // PNG: 8-byte signature, then IHDR chunk with width/height (big-endian).
  if (buf[0] === 0x89 && ascii(1, 3) === "PNG" && buf.length >= 24 && ascii(12, 4) === "IHDR") {
    return { type: "png", width: view.getUint32(16), height: view.getUint32(20) };
  }

  // GIF: "GIF87a" / "GIF89a", logical screen size (little-endian).
  if (ascii(0, 4) === "GIF8") {
    return { type: "gif", width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }

  // WebP: RIFF....WEBP + VP8 / VP8L / VP8X chunk.
  if (ascii(0, 4) === "RIFF" && buf.length >= 30 && ascii(8, 4) === "WEBP") {
    const chunk = ascii(12, 4);
    if (chunk === "VP8 ") {
      // Lossy: frame tag (3 bytes) + start code 9d 01 2a, then 14-bit sizes.
      if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
      return {
        type: "webp",
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (chunk === "VP8L") {
      if (buf[20] !== 0x2f) return null;
      const b1 = buf[21]!;
      const b2 = buf[22]!;
      const b3 = buf[23]!;
      const b4 = buf[24]!;
      return {
        type: "webp",
        width: 1 + (((b2 & 0x3f) << 8) | b1),
        height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
      };
    }
    if (chunk === "VP8X") {
      const w = 1 + (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16));
      const h = 1 + (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16));
      return { type: "webp", width: w, height: h };
    }
    return null;
  }

  // JPEG: walk segments until a SOFn marker.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) {
        o++;
        continue;
      }
      const marker = buf[o + 1]!;
      if (marker === 0xff) {
        o++;
        continue;
      }
      // Standalone markers without length.
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        o += 2;
        continue;
      }
      const len = view.getUint16(o + 2);
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return { type: "jpeg", height: view.getUint16(o + 5), width: view.getUint16(o + 7) };
      }
      if (len < 2) return null;
      o += 2 + len;
    }
    return null;
  }
  return null;
}
