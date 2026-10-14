import { describe, expect, it } from "vitest";
import {
  AMBIGUOUS,
  CHARSETS,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassphrase,
  generatePassword,
  passphraseEntropy,
  passwordEntropy,
  randomInt,
} from "./generator";
import { charClasses, checkMasterPassword, estimateStrength, passphraseWords } from "./strength";
import { WORDLIST } from "./wordlist";

describe("wordlist", () => {
  it("has at least 512 unique, short, lowercase words", () => {
    expect(WORDLIST.length).toBeGreaterThanOrEqual(512);
    expect(new Set(WORDLIST).size).toBe(WORDLIST.length);
    for (const w of WORDLIST) expect(w).toMatch(/^[a-z]{3,7}$/);
  });
});

describe("randomInt", () => {
  it("stays in range and covers all values", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = randomInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
      seen.add(n);
    }
    expect(seen.size).toBe(7);
    expect(() => randomInt(0)).toThrow();
  });
});

describe("generatePassword", () => {
  it("respects length bounds and includes every enabled class", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 12 });
      expect(pw).toHaveLength(12);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
      expect([...pw].some((c) => CHARSETS.symbols.includes(c))).toBe(true);
    }
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 3 })).toHaveLength(8);
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 500 })).toHaveLength(64);
  });

  it("honours toggles and the ambiguous-character filter", () => {
    const digitsOnly = generatePassword({
      length: 30,
      upper: false,
      lower: false,
      digits: true,
      symbols: false,
      excludeAmbiguous: true,
    });
    expect(digitsOnly).toMatch(/^[2-9]{30}$/);
    for (let i = 0; i < 30; i++) {
      const pw = generatePassword({
        ...DEFAULT_PASSWORD_OPTIONS,
        length: 64,
        excludeAmbiguous: true,
      });
      expect([...pw].some((c) => AMBIGUOUS.includes(c))).toBe(false);
    }
    // Nothing selected → falls back to lowercase.
    const none = generatePassword({
      length: 10,
      upper: false,
      lower: false,
      digits: false,
      symbols: false,
      excludeAmbiguous: false,
    });
    expect(none).toMatch(/^[a-z]{10}$/);
  });

  it("estimates entropy from length and pool size", () => {
    expect(passwordEntropy({ ...DEFAULT_PASSWORD_OPTIONS, length: 20 })).toBeGreaterThan(120);
    const digits = {
      length: 10,
      upper: false,
      lower: false,
      digits: true,
      symbols: false,
      excludeAmbiguous: false,
    };
    expect(passwordEntropy(digits)).toBeCloseTo(10 * Math.log2(10));
  });
});

describe("generatePassphrase", () => {
  it("joins wordlist words with the separator, capitalised, with one number", () => {
    const pp = generatePassphrase({
      words: 5,
      separator: "-",
      capitalize: true,
      includeNumber: true,
    });
    const parts = pp.split("-");
    expect(parts).toHaveLength(5);
    for (const p of parts) {
      expect(p).toMatch(/^[A-Z][a-z]+\d?$/);
      expect(WORDLIST).toContain(p.replace(/\d/, "").toLowerCase());
    }
    expect(pp.match(/\d/g)).toHaveLength(1);
  });

  it("supports plain lowercase words and clamps the word count", () => {
    const pp = generatePassphrase({
      words: 50,
      separator: " ",
      capitalize: false,
      includeNumber: false,
    });
    expect(pp.split(" ")).toHaveLength(12);
    expect(pp).toMatch(/^[a-z ]+$/);
    expect(
      passphraseEntropy({ words: 6, separator: "-", capitalize: true, includeNumber: false }),
    ).toBeGreaterThan(55);
  });
});

describe("strength", () => {
  it("rates obvious passwords as very weak", () => {
    for (const pw of ["password", "123456", "qwerty123", "aaaaaaaaaaaa", "abcdefgh"]) {
      expect(estimateStrength(pw).score, pw).toBeLessThanOrEqual(1);
    }
    expect(estimateStrength("").score).toBe(0);
    expect(estimateStrength("Password123!").warnings).toContain("common");
  });

  it("rates random generated passwords as very strong", () => {
    const pw = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 20 });
    expect(estimateStrength(pw).score).toBe(4);
  });

  it("detects passphrases (also in Persian) and estimates them conservatively", () => {
    expect(passphraseWords("Lunar-Tiger7-cactus-Ember")).toHaveLength(4);
    expect(passphraseWords("گربه سفید روی دیوار نشست")).toHaveLength(5);
    expect(passphraseWords("my dog is brown")).toBeNull();
    const six = estimateStrength("Lunar-Tiger7-cactus-Ember-Quilt-Mango");
    expect(six.passphrase).toBe(true);
    expect(six.score).toBe(3);
  });

  it("counts character classes", () => {
    expect(charClasses("abc")).toBe(1);
    expect(charClasses("aB3!")).toBe(4);
    expect(charClasses("سلام123")).toBe(2);
  });

  it("enforces master password rules", () => {
    expect(checkMasterPassword("short1!").ok).toBe(false);
    expect(checkMasterPassword("alllowercaseletters").ok).toBe(false); // one class, not a passphrase
    expect(checkMasterPassword("Password123456!").ok).toBe(false); // common
    expect(checkMasterPassword("aaaaaaaaaaaaaaaa1").ok).toBe(false); // repeats
    expect(checkMasterPassword("Velvet-Orbit-Cactus-Mango9").ok).toBe(true);
    expect(checkMasterPassword("t9#Kq2!vLm8@Zx").ok).toBe(true);
    expect(checkMasterPassword("گربه سفید روی دیوار نشست").ok).toBe(true);
  });
});
