/**
 * Password & passphrase generator (pure, uses crypto.getRandomValues with
 * rejection sampling so every character/word is uniformly distributed).
 */
import { WORDLIST } from "./wordlist";

export const CHARSETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/~",
} as const;

/** Characters that are easy to confuse when read or typed by hand. */
export const AMBIGUOUS = "Il1|O0o`'\"";

export const PASSWORD_LENGTH = { min: 8, max: 64 } as const;
export const PASSPHRASE_WORDS = { min: 3, max: 12 } as const;

export interface PasswordOptions {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
};

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = {
  words: 6,
  separator: "-",
  capitalize: true,
  includeNumber: true,
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));

/** Uniform random integer in [0, max) from the CSPRNG. */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError("bad max");
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** The character classes enabled by `opts` (never empty: falls back to lowercase). */
export function enabledCharsets(opts: PasswordOptions): string[] {
  const strip = (s: string) =>
    opts.excludeAmbiguous ? [...s].filter((c) => !AMBIGUOUS.includes(c)).join("") : s;
  const sets = (["upper", "lower", "digits", "symbols"] as const)
    .filter((k) => opts[k])
    .map((k) => strip(CHARSETS[k]))
    .filter(Boolean);
  return sets.length ? sets : [strip(CHARSETS.lower)];
}

/** Random password with at least one character from every enabled class. */
export function generatePassword(opts: PasswordOptions = DEFAULT_PASSWORD_OPTIONS): string {
  const length = clamp(opts.length, PASSWORD_LENGTH.min, PASSWORD_LENGTH.max);
  const sets = enabledCharsets(opts);
  const all = sets.join("");
  const chars = sets.map((s) => s[randomInt(s.length)]!);
  while (chars.length < length) chars.push(all[randomInt(all.length)]!);
  return shuffle(chars).join("");
}

/** Diceware-style passphrase from the built-in wordlist. */
export function generatePassphrase(opts: PassphraseOptions = DEFAULT_PASSPHRASE_OPTIONS): string {
  const n = clamp(opts.words, PASSPHRASE_WORDS.min, PASSPHRASE_WORDS.max);
  const words = Array.from({ length: n }, () => {
    const w = WORDLIST[randomInt(WORDLIST.length)]!;
    return opts.capitalize ? w[0]!.toUpperCase() + w.slice(1) : w;
  });
  if (opts.includeNumber) {
    const i = randomInt(n);
    words[i] = `${words[i]}${randomInt(10)}`;
  }
  return words.join(opts.separator);
}

/** Entropy (bits) of a generated password with these options. */
export function passwordEntropy(opts: PasswordOptions) {
  const length = clamp(opts.length, PASSWORD_LENGTH.min, PASSWORD_LENGTH.max);
  return length * Math.log2(enabledCharsets(opts).join("").length);
}

/** Entropy (bits) of a generated passphrase with these options. */
export function passphraseEntropy(opts: PassphraseOptions) {
  const n = clamp(opts.words, PASSPHRASE_WORDS.min, PASSPHRASE_WORDS.max);
  return n * Math.log2(WORDLIST.length) + (opts.includeNumber ? Math.log2(10 * n) : 0);
}
