import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );

// OWASP-recommended scrypt parameters (N=2^17 is ideal; 2^15 keeps login < 100ms on small VPSes).
const N = 32768;
const r = 8;
const p = 1;
const KEYLEN = 64;
const MAXMEM = 128 * N * r * 2;

/** Hash format: scrypt$N$r$p$saltB64$hashB64 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r, p, maxmem: MAXMEM });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) {
    // Burn comparable time to avoid user-enumeration via timing.
    await hashPassword(password);
    return false;
  }
  const [algo, n, rr, pp, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !n || !rr || !pp || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const key = await scrypt(
    password.normalize("NFKC"),
    Buffer.from(saltB64, "base64"),
    expected.length,
    {
      N: Number(n),
      r: Number(rr),
      p: Number(pp),
      maxmem: 128 * Number(n) * Number(rr) * 2,
    },
  );
  return key.length === expected.length && timingSafeEqual(key, expected);
}
