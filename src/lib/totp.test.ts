import { describe, expect, it } from "vitest";
import { formatTotpCode, hotp, parseOtpauthUri, parseTotp, totp, type TotpParams } from "./totp";
import { base32Encode } from "./vault-crypto";

const ascii = (s: string) => new TextEncoder().encode(s);

describe("hotp (RFC 4226 appendix D)", () => {
  const secret = ascii("12345678901234567890");
  const expected = [
    "755224",
    "287082",
    "359152",
    "969429",
    "338314",
    "254676",
    "287922",
    "162583",
    "399871",
    "520489",
  ];
  it.each(expected.map((code, counter) => [counter, code]))("counter %i → %s", async (c, code) => {
    expect(await hotp(secret, c as number)).toBe(code);
  });
});

describe("totp (RFC 6238 appendix B, 8 digits)", () => {
  const seeds = {
    "SHA-1": ascii("12345678901234567890"),
    "SHA-256": ascii("12345678901234567890123456789012"),
    "SHA-512": ascii("1234567890123456789012345678901234567890123456789012345678901234"),
  } as const;
  const vectors: [number, string, keyof typeof seeds][] = [
    [59, "94287082", "SHA-1"],
    [59, "46119246", "SHA-256"],
    [59, "90693936", "SHA-512"],
    [1111111109, "07081804", "SHA-1"],
    [1111111109, "68084774", "SHA-256"],
    [1111111109, "25091201", "SHA-512"],
    [1111111111, "14050471", "SHA-1"],
    [1111111111, "67062674", "SHA-256"],
    [1111111111, "99943326", "SHA-512"],
    [1234567890, "89005924", "SHA-1"],
    [1234567890, "91819424", "SHA-256"],
    [1234567890, "93441116", "SHA-512"],
    [2000000000, "69279037", "SHA-1"],
    [2000000000, "90698825", "SHA-256"],
    [2000000000, "38618901", "SHA-512"],
    [20000000000, "65353130", "SHA-1"],
    [20000000000, "77737706", "SHA-256"],
    [20000000000, "47863826", "SHA-512"],
  ];
  it.each(vectors)("T=%i → %s (%s)", async (t, code, algorithm) => {
    const params: TotpParams = { secret: seeds[algorithm], algorithm, digits: 8, period: 30 };
    const res = await totp(params, t * 1000);
    expect(res.code).toBe(code);
  });

  it("reports the seconds remaining in the period", async () => {
    const params: TotpParams = {
      secret: seeds["SHA-1"],
      algorithm: "SHA-1",
      digits: 6,
      period: 30,
    };
    expect((await totp(params, 59_000)).remaining).toBe(1);
    expect((await totp(params, 60_000)).remaining).toBe(30);
  });
});

describe("parseTotp / parseOtpauthUri", () => {
  const secret = base32Encode(ascii("12345678901234567890")); // GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ

  it("parses a raw base32 secret with spaces and lowercase", async () => {
    const spaced = secret.toLowerCase().replace(/(.{4})/g, "$1 ");
    const p = parseTotp(spaced)!;
    expect(p).toMatchObject({ algorithm: "SHA-1", digits: 6, period: 30 });
    expect(await hotp(p.secret, 1)).toBe("287082");
  });

  it("parses an otpauth URI with issuer, label and parameters", () => {
    const p = parseOtpauthUri(
      `otpauth://totp/GitHub:sara%40example.com?secret=${secret}&issuer=GitHub&algorithm=SHA256&digits=8&period=60`,
    )!;
    expect(p.issuer).toBe("GitHub");
    expect(p.account).toBe("sara@example.com");
    expect(p.algorithm).toBe("SHA-256");
    expect(p.digits).toBe(8);
    expect(p.period).toBe(60);
  });

  it("takes the issuer from the label when the parameter is missing", () => {
    const p = parseTotp(`otpauth://totp/ACME%20Co:john?secret=${secret}`)!;
    expect(p.issuer).toBe("ACME Co");
    expect(p.account).toBe("john");
    expect(p.algorithm).toBe("SHA-1");
  });

  it("rejects garbage, HOTP URIs and too-short secrets", () => {
    expect(parseTotp("")).toBeNull();
    expect(parseTotp("not a secret!")).toBeNull();
    expect(parseTotp("JBSW")).toBeNull();
    expect(parseTotp(`otpauth://hotp/x?secret=${secret}&counter=1`)).toBeNull();
    expect(parseTotp("otpauth://totp/x?secret=")).toBeNull();
    expect(parseTotp(`otpauth://totp/x?secret=${secret}&algorithm=MD5`)).toBeNull();
  });

  it("formats codes in two halves", () => {
    expect(formatTotpCode("123456")).toBe("123 456");
    expect(formatTotpCode("12345678")).toBe("1234 5678");
  });
});
