/**
 * Media file-type sniffing + safe file names. Pure (no fs) — used by the
 * media service and the /media route. The browser-supplied MIME type is never
 * trusted: the type comes from magic bytes (and the extension for SVG).
 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const mediaKinds = {
  "image/png": { ext: "png", kind: "image" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/avif": { ext: "avif", kind: "image" },
  "image/gif": { ext: "gif", kind: "image" },
  "image/svg+xml": { ext: "svg", kind: "image" },
  "application/pdf": { ext: "pdf", kind: "pdf" },
  "video/mp4": { ext: "mp4", kind: "video" },
} as const;
export type MediaMime = keyof typeof mediaKinds;

const ascii = (b: Uint8Array, o: number, n: number) =>
  String.fromCharCode(...b.subarray(o, Math.min(b.length, o + n)));

/** Detect an allowed MIME type from the first bytes (+ name for SVG). Null = rejected. */
export function sniffMime(head: Uint8Array, fileName: string): MediaMime | null {
  if (head[0] === 0x89 && ascii(head, 1, 3) === "PNG") return "image/png";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (ascii(head, 0, 4) === "GIF8") return "image/gif";
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WEBP") return "image/webp";
  if (ascii(head, 0, 5) === "%PDF-") return "application/pdf";
  if (ascii(head, 4, 4) === "ftyp") {
    const brands = ascii(head, 8, 24);
    if (/avif|avis/.test(brands)) return "image/avif";
    if (/isom|iso2|mp41|mp42|avc1|M4V |dash/.test(brands)) return "video/mp4";
    return null;
  }
  if (/\.svg$/i.test(fileName)) {
    // trimStart() also strips a UTF-8 BOM (U+FEFF counts as whitespace).
    const text = new TextDecoder().decode(head).trimStart();
    if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/i.test(text)) {
      return "image/svg+xml";
    }
  }
  return null;
}

/** "My Photo (1).PNG" → "my-photo-1.png" — ASCII-safe for URLs and the filesystem. */
export function safeFileName(original: string, mime: MediaMime) {
  const ext = mediaKinds[mime].ext;
  const base = original
    .replace(/\.[A-Za-z0-9]{1,8}$/, "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "file"}.${ext}`;
}

export const mediaUrl = (m: { id: string; fileName: string }) => `/media/${m.id}/${m.fileName}`;
