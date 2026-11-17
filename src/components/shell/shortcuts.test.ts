import { describe, expect, it } from "vitest";
import { isCommandPaletteShortcut } from "./shortcuts";

const ev = (over: Partial<KeyboardEvent>) =>
  ({ key: "k", code: "KeyK", metaKey: false, ctrlKey: false, altKey: false, ...over }) as Pick<
    KeyboardEvent,
    "key" | "code" | "metaKey" | "ctrlKey" | "altKey"
  >;

describe("isCommandPaletteShortcut", () => {
  it("matches ⌘K and Ctrl+K on a Latin layout", () => {
    expect(isCommandPaletteShortcut(ev({ metaKey: true }))).toBe(true);
    expect(isCommandPaletteShortcut(ev({ ctrlKey: true }))).toBe(true);
    expect(isCommandPaletteShortcut(ev({ ctrlKey: true, key: "K" }))).toBe(true);
  });

  it("matches the physical K key on a Persian layout", () => {
    expect(isCommandPaletteShortcut(ev({ metaKey: true, key: "ن" }))).toBe(true);
    expect(isCommandPaletteShortcut(ev({ ctrlKey: true, key: "л" }))).toBe(true);
  });

  it("needs ⌘ or Ctrl and ignores Alt combinations", () => {
    expect(isCommandPaletteShortcut(ev({}))).toBe(false);
    expect(isCommandPaletteShortcut(ev({ key: "ن" }))).toBe(false);
    expect(isCommandPaletteShortcut(ev({ metaKey: true, altKey: true }))).toBe(false);
  });

  it("follows the letter on remapped Latin layouts (Dvorak)", () => {
    // Dvorak: the physical K key types "t" — ⌘T must stay "new tab".
    expect(isCommandPaletteShortcut(ev({ metaKey: true, key: "t", code: "KeyK" }))).toBe(false);
    // …and "k" sits on the physical V key.
    expect(isCommandPaletteShortcut(ev({ metaKey: true, key: "k", code: "KeyV" }))).toBe(true);
  });
});
