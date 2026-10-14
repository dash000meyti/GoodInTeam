import { describe, expect, it } from "vitest";
import { safeFileName, sniffMime } from "./storage";

const enc = (s: string) => new TextEncoder().encode(s);

describe("sniffMime", () => {
  it("detects binary formats by magic bytes, ignoring the name", () => {
    expect(sniffMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0]), "x.jpg")).toBe("image/png");
    expect(sniffMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]), "x.png")).toBe("image/jpeg");
    expect(sniffMime(enc("%PDF-1.7 ..."), "doc.bin")).toBe("application/pdf");
    expect(sniffMime(enc("RIFF\0\0\0\0WEBPVP8 "), "a")).toBe("image/webp");
    expect(sniffMime(enc("\0\0\0\x1cftypavif\0\0\0\0avifmif1"), "a.avif")).toBe("image/avif");
    expect(sniffMime(enc("\0\0\0\x18ftypmp42\0\0\0\0isommp42"), "v.mp4")).toBe("video/mp4");
  });

  it("accepts SVG only with .svg name and an <svg> root", () => {
    expect(sniffMime(enc('<?xml version="1.0"?>\n<svg xmlns="x">'), "logo.svg")).toBe(
      "image/svg+xml",
    );
    expect(sniffMime(enc("<svg viewBox='0 0 1 1'>"), "logo.txt")).toBeNull();
    expect(sniffMime(enc("<html><svg>"), "evil.svg")).toBeNull();
  });

  it("rejects everything else", () => {
    expect(sniffMime(enc("#!/bin/sh\nrm -rf /"), "run.sh")).toBeNull();
    expect(sniffMime(enc("PK\x03\x04"), "a.zip")).toBeNull();
  });
});

describe("safeFileName", () => {
  it("normalizes names and forces the sniffed extension", () => {
    expect(safeFileName("My Photo (1).PNG", "image/png")).toBe("my-photo-1.png");
    expect(safeFileName("../../etc/passwd", "image/jpeg")).toBe("etcpasswd.jpg");
    expect(safeFileName("عکس.jpg", "image/jpeg")).toBe("file.jpg");
  });
});
