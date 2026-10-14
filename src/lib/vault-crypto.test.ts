import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  base64ToBytes,
  bytesToBase64,
  createVaultKeys,
  decryptItem,
  deriveKek,
  encryptItem,
  formatRecoveryKey,
  generateRecoveryKey,
  generateVaultKey,
  parseRecoveryKey,
  randomBytes,
  toSessionKey,
  unlockWithPassword,
  unlockWithRecoveryKey,
  unwrapKey,
  VaultCryptoError,
  wrapKey,
  wrapWithPassword,
  wrapWithRecoveryKey,
  type VaultKeyMaterial,
} from "./vault-crypto";

// Low work factors keep the suite fast; production uses 600k / 100k.
const FAST = { iterations: 1_000, recoveryIterations: 1_000 };

async function expectCode(p: Promise<unknown>, code: VaultCryptoError["code"]) {
  await expect(p).rejects.toBeInstanceOf(VaultCryptoError);
  await expect(p).rejects.toMatchObject({ code });
}

describe("encoding", () => {
  it("round-trips base64 for all byte values and large buffers", () => {
    const all = new Uint8Array(256).map((_, i) => i);
    expect(base64ToBytes(bytesToBase64(all))).toEqual(all);
    const big = randomBytes(200_000);
    expect(base64ToBytes(bytesToBase64(big))).toEqual(big);
  });

  it("matches RFC 4648 base32 test vectors", () => {
    const enc = new TextEncoder();
    const cases: [string, string][] = [
      ["", ""],
      ["f", "MY"],
      ["fo", "MZXQ"],
      ["foo", "MZXW6"],
      ["foob", "MZXW6YQ"],
      ["fooba", "MZXW6YTB"],
      ["foobar", "MZXW6YTBOI"],
    ];
    for (const [plain, b32] of cases) {
      expect(base32Encode(enc.encode(plain))).toBe(b32);
      expect(new TextDecoder().decode(base32Decode(b32)!)).toBe(plain);
    }
    expect(base32Decode("mzxw 6ytb-oi==")).toEqual(enc.encode("foobar"));
    expect(base32Decode("not!base32")).toBeNull();
  });
});

describe("key wrapping", () => {
  it("wraps and unwraps the vault key with a password-derived KEK", async () => {
    const vaultKey = await generateVaultKey();
    const salt = randomBytes(16);
    const kek = await deriveKek("correct horse battery staple", salt, 1_000);
    expect(kek.extractable).toBe(false);
    expect(kek.usages.sort()).toEqual(["unwrapKey", "wrapKey"]);

    const wrapped = await wrapKey(vaultKey, kek);
    expect(base64ToBytes(wrapped.iv)).toHaveLength(12);
    expect(base64ToBytes(wrapped.wrappedKey)).toHaveLength(48);

    const unwrapped = await unwrapKey(wrapped, kek, true);
    const a = new Uint8Array(await crypto.subtle.exportKey("raw", vaultKey));
    const b = new Uint8Array(await crypto.subtle.exportKey("raw", unwrapped));
    expect(b).toEqual(a);
  });

  it("fails with bad_secret for a wrong password", async () => {
    const vaultKey = await generateVaultKey();
    const salt = randomBytes(16);
    const wrapped = await wrapKey(vaultKey, await deriveKek("right password!!", salt, 1_000));
    await expectCode(
      unwrapKey(wrapped, await deriveKek("wrong password!!", salt, 1_000)),
      "bad_secret",
    );
  });

  it("uses a fresh IV for every wrap and encryption", async () => {
    const vaultKey = await generateVaultKey();
    const kek = await deriveKek("pw", randomBytes(16), 1_000);
    const w1 = await wrapKey(vaultKey, kek);
    const w2 = await wrapKey(vaultKey, kek);
    expect(w1.iv).not.toBe(w2.iv);
    expect(w1.wrappedKey).not.toBe(w2.wrappedKey);
    const e1 = await encryptItem(vaultKey, { a: 1 });
    const e2 = await encryptItem(vaultKey, { a: 1 });
    expect(e1.iv).not.toBe(e2.iv);
    expect(e1.ciphertext).not.toBe(e2.ciphertext);
  });

  it("produces non-extractable session keys", async () => {
    const vaultKey = await generateVaultKey();
    const session = await toSessionKey(vaultKey);
    expect(session.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", session)).rejects.toThrow();
    const blob = await encryptItem(session, { ok: true });
    expect(await decryptItem(vaultKey, blob)).toEqual({ ok: true });
  });
});

describe("item encryption", () => {
  it("round-trips JSON payloads (including Persian text)", async () => {
    const key = await generateVaultKey();
    const payload = { v: 1, title: "سرور آکمه", data: { password: "p@ss🔑" }, n: [1, 2] };
    const blob = await encryptItem(key, payload);
    expect(blob.ciphertext).not.toContain("سرور");
    expect(await decryptItem(key, blob)).toEqual(payload);
  });

  it("rejects tampered ciphertext and the wrong key", async () => {
    const key = await generateVaultKey();
    const blob = await encryptItem(key, { secret: "x" });
    const bytes = base64ToBytes(blob.ciphertext);
    bytes[0] = bytes[0]! ^ 1;
    await expectCode(decryptItem(key, { ...blob, ciphertext: bytesToBase64(bytes) }), "corrupt");
    await expectCode(decryptItem(await generateVaultKey(), blob), "corrupt");
  });
});

describe("recovery key format", () => {
  it("renders 32 random bytes as 13 groups of 4 base32 chars", () => {
    const rk = generateRecoveryKey();
    expect(rk).toMatch(/^([A-Z2-7]{4}-){12}[A-Z2-7]{4}$/);
    expect(parseRecoveryKey(rk)).toHaveLength(32);
    expect(generateRecoveryKey()).not.toBe(rk);
  });

  it("tolerates lowercase, whitespace and look-alike characters", () => {
    const rk = generateRecoveryKey();
    const bytes = parseRecoveryKey(rk)!;
    const sloppy = rk.toLowerCase().replace(/-/g, " ").replace(/o/g, "0").replace(/i/g, "1");
    expect(parseRecoveryKey(sloppy)).toEqual(bytes);
    expect(formatRecoveryKey(rk.replace(/-/g, ""))).toBe(rk);
  });

  it("rejects malformed keys", () => {
    expect(parseRecoveryKey("")).toBeNull();
    expect(parseRecoveryKey("ABCD-EFGH")).toBeNull();
    expect(parseRecoveryKey(`${generateRecoveryKey()}A`)).toBeNull();
  });
});

describe("vault flows", () => {
  it("creates a vault and unlocks it with the master password", async () => {
    const { material, recoveryKey, sessionKey } = await createVaultKeys(
      "a long master passphrase",
      FAST,
    );
    expect(material.kdf).toBe("PBKDF2-SHA256");
    expect(sessionKey.extractable).toBe(false);
    // Nothing secret leaks into the stored material.
    const json = JSON.stringify(material);
    expect(json).not.toContain("a long master passphrase");
    expect(json).not.toContain(recoveryKey.replace(/-/g, ""));

    const blob = await encryptItem(sessionKey, { title: "GitHub" });
    const full: VaultKeyMaterial = { ...material };
    const key = await unlockWithPassword(full, "a long master passphrase");
    expect(key.extractable).toBe(false);
    expect(await decryptItem(key, blob)).toEqual({ title: "GitHub" });
  });

  it("treats Persian and ASCII digits in the password as equal", async () => {
    const { material } = await createVaultKeys("سلام-دنیا-2026-amber", FAST);
    await expect(unlockWithPassword(material, "سلام-دنیا-۲۰۲۶-amber")).resolves.toBeDefined();
  });

  it("refuses a wrong master password", async () => {
    const { material } = await createVaultKeys("a long master passphrase", FAST);
    await expectCode(unlockWithPassword(material, "a long master passphrasE"), "bad_secret");
  });

  it("recovers with the recovery key and re-wraps with a new password", async () => {
    const { material, recoveryKey, sessionKey } = await createVaultKeys("forgotten one!", FAST);
    const blob = await encryptItem(sessionKey, { title: "Server" });

    // Typed back sloppily by the user.
    const typed = recoveryKey.toLowerCase().replace(/-/g, " ");
    const recovered = await unlockWithRecoveryKey(material, typed, true, FAST.recoveryIterations);
    expect(await decryptItem(recovered, blob)).toEqual({ title: "Server" });

    const master = await wrapWithPassword(recovered, "brand new password", FAST.iterations);
    const nextRecovery = generateRecoveryKey();
    const recovery = await wrapWithRecoveryKey(recovered, nextRecovery, FAST.recoveryIterations);
    const next: VaultKeyMaterial = { ...master, ...recovery };

    const key = await unlockWithPassword(next, "brand new password");
    expect(await decryptItem(key, blob)).toEqual({ title: "Server" });
    await expectCode(unlockWithPassword(next, "forgotten one!"), "bad_secret");
    await expectCode(
      unlockWithRecoveryKey(next, recoveryKey, false, FAST.recoveryIterations),
      "bad_secret",
    );
    const viaNew = await unlockWithRecoveryKey(next, nextRecovery, false, FAST.recoveryIterations);
    expect(await decryptItem(viaNew, blob)).toEqual({ title: "Server" });
  });

  it("reports invalid or missing recovery material", async () => {
    const { material } = await createVaultKeys("whatever password", FAST);
    await expectCode(unlockWithRecoveryKey(material, "nope"), "invalid_recovery_key");
    await expectCode(
      unlockWithRecoveryKey({ ...material, recoverySalt: null }, generateRecoveryKey()),
      "no_recovery",
    );
    await expectCode(
      unlockWithRecoveryKey(material, generateRecoveryKey(), false, FAST.recoveryIterations),
      "bad_secret",
    );
  });

  it("uses the production work factor by default", async () => {
    const vaultKey = await generateVaultKey();
    const wrap = await wrapWithPassword(vaultKey, "x".repeat(12));
    expect(wrap.iterations).toBe(600_000);
  });
});
