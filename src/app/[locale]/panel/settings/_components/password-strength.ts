/**
 * Rough, dependency-free password strength (0–4) for the change-password
 * meter. Favors length (passphrases) over symbol soup. Pure — unit tested.
 */
export type Strength = 0 | 1 | 2 | 3 | 4;

const COMMON = [
  "password",
  "qwerty",
  "123456",
  "654321",
  "111111",
  "abcdef",
  "goodteam",
  "iloveyou",
  "admin",
  "letmein",
];

export function passwordStrength(pw: string, minLength = 10): Strength {
  if (pw.length < minLength) return 0;
  const lower = pw.toLowerCase();
  const unique = new Set(pw).size;
  if (unique <= 2 || COMMON.some((c) => lower.includes(c) && lower.length < c.length + 6)) return 1;

  let score = 1;
  if (pw.length >= 14) score++;
  if (pw.length >= 20) score++;
  const classes = [
    /[a-z]/.test(pw),
    /[A-Z]/.test(pw),
    /\d/.test(pw),
    /[^\p{L}\p{N}]/u.test(pw), // symbols & spaces
    /[^\x00-\x7F]/.test(pw) && /\p{L}/u.test(pw), // non-Latin letters (e.g. Persian)
  ].filter(Boolean).length;
  if (classes >= 3) score++;
  if (unique < 6) score--;
  return Math.max(1, Math.min(4, score)) as Strength;
}
