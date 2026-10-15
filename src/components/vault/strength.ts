/**
 * Lightweight password strength estimate (no dependencies): character-pool
 * entropy with penalties for common passwords, repeats and sequences, and a
 * dictionary-based estimate for passphrases. Good enough to steer users; it
 * is deliberately conservative for passphrases.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4;
export type StrengthWarning = "common" | "repeat" | "sequence" | "short";

export interface StrengthResult {
  score: StrengthScore;
  bits: number;
  passphrase: boolean;
  warnings: StrengthWarning[];
}

const COMMON = [
  "password",
  "passw0rd",
  "p@ssw0rd",
  "123456",
  "654321",
  "111111",
  "000000",
  "qwerty",
  "asdfgh",
  "zxcvbn",
  "1q2w3e",
  "zaq12wsx",
  "abc123",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "monkey",
  "dragon",
  "football",
  "baseball",
  "master",
  "sunshine",
  "princess",
  "superman",
  "trustno1",
  "changeme",
  "secret",
  "goodteam",
  "login",
];

/** Bits per word assumed for passphrases (a ~2k-word dictionary). */
const BITS_PER_WORD = 10;

function poolSize(pw: string) {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[!-/:-@[-`{-~]/.test(pw)) pool += 33;
  if (/[^\x00-\x7F]/.test(pw)) pool += 64; // Persian and other scripts
  if (/\s/.test(pw)) pool += 1;
  return Math.max(pool, 2);
}

/** Number of character classes used (lower, upper, digit, symbol, non-Latin). */
export function charClasses(pw: string) {
  return [/[a-z]/, /[A-Z]/, /[0-9]/, /[!-/:-@[-`{-~]/, /[^\x00-\x7F\s]/].filter((r) => r.test(pw))
    .length;
}

/** Words of a passphrase ("Lunar-Tiger7 cactus…"), or null when it isn't one. */
export function passphraseWords(pw: string): string[] | null {
  const parts = pw
    .trim()
    .split(/[\s\-_.,+]+/)
    .filter(Boolean);
  if (parts.length < 4) return null;
  return parts.every((w) => /^\p{L}{3,}\p{N}*$/u.test(w)) ? parts : null;
}

function sequenceRuns(pw: string) {
  let penaltyChars = 0;
  let run = 1;
  let dir = 0;
  for (let i = 1; i < pw.length; i++) {
    const d = pw.charCodeAt(i) - pw.charCodeAt(i - 1);
    if ((d === 1 || d === -1) && (run === 1 || d === dir)) {
      dir = d;
      run++;
    } else {
      if (run >= 3) penaltyChars += run - 1;
      run = 1;
      dir = 0;
    }
  }
  if (run >= 3) penaltyChars += run - 1;
  return penaltyChars;
}

function repeatRuns(pw: string) {
  let penaltyChars = 0;
  for (const m of pw.matchAll(/(.)\1{2,}/gu)) penaltyChars += m[0].length - 1;
  return penaltyChars;
}

export function estimateStrength(pw: string): StrengthResult {
  if (!pw) return { score: 0, bits: 0, passphrase: false, warnings: [] };
  const warnings: StrengthWarning[] = [];
  const perChar = Math.log2(poolSize(pw));
  const length = [...pw].length;
  let bits = length * perChar;

  const lower = pw.toLowerCase();
  const common = COMMON.filter((c) => lower.includes(c)).sort((a, b) => b.length - a.length)[0];
  if (common) {
    warnings.push("common");
    bits -= common.length * perChar * 0.9;
    if (lower.replace(/[^a-z0-9@]/g, "") === common) bits = Math.min(bits, 4);
  }
  const rep = repeatRuns(pw);
  if (rep) {
    warnings.push("repeat");
    bits -= rep * perChar;
  }
  const seq = sequenceRuns(pw);
  if (seq) {
    warnings.push("sequence");
    bits -= seq * perChar * 0.8;
  }

  const words = passphraseWords(pw);
  if (words) {
    const extras = (/\p{N}/u.test(pw) ? 3.3 : 0) + (/[A-Z]/.test(pw) ? 1 : 0);
    bits = Math.min(bits, words.length * BITS_PER_WORD + extras);
  }
  if (length < 8) warnings.push("short");
  bits = Math.max(0, bits);

  let score: StrengthScore = bits < 28 ? 0 : bits < 40 ? 1 : bits < 56 ? 2 : bits < 72 ? 3 : 4;
  if (length < 8 && score > 1) score = 1;
  return { score, bits: Math.round(bits), passphrase: !!words, warnings };
}

export interface MasterPasswordCheck {
  /** At least 12 characters. */
  length: boolean;
  /** Two or more character classes — or a passphrase of 4+ words. */
  variety: boolean;
  /** Not built around a common/predictable password, repeats or sequences. */
  unpredictable: boolean;
  strength: StrengthResult;
  ok: boolean;
}

/** Rules for the vault master password: ≥ 12 characters and at least "fair". */
export function checkMasterPassword(pw: string): MasterPasswordCheck {
  const strength = estimateStrength(pw);
  const length = [...pw].length >= 12;
  const variety = strength.passphrase || charClasses(pw) >= 2;
  const unpredictable = !strength.warnings.some((w) => w === "common" || w === "repeat");
  return {
    length,
    variety,
    unpredictable,
    strength,
    ok: length && variety && unpredictable && strength.score >= 2,
  };
}
