import { describe, expect, it } from "vitest";
import { passwordStrength } from "./password-strength";

describe("passwordStrength", () => {
  it("is 0 below the minimum length", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("Ab1!xyz")).toBe(0);
  });
  it("punishes repeated or common passwords", () => {
    expect(passwordStrength("aaaaaaaaaaaa")).toBe(1);
    expect(passwordStrength("password1234")).toBe(1);
    expect(passwordStrength("goodteam2024")).toBe(1);
  });
  it("rewards length and variety", () => {
    expect(passwordStrength("kitchenlamp")).toBe(1);
    expect(passwordStrength("Kitchen-lamp-7")).toBe(3);
    expect(passwordStrength("correct horse battery staple")).toBe(3);
    expect(passwordStrength("Correct horse battery staple 9!")).toBe(4);
  });
  it("counts Persian passphrases", () => {
    expect(passwordStrength("چای داغ با نعنا 42")).toBeGreaterThanOrEqual(3);
  });
});
