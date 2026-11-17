import { describe, expect, it } from "vitest";
import { messages } from "./index";

/**
 * D2 guard: the Persian brand form is «گودین تیم» (with «گودین استودیو» and
 * «گودین کد»). The old «گود تیم» and the rejected spaced «گود این» ("the pit
 * of this") must never come back into an fa message. If the owner picks a
 * different form, change every «گودین» touchpoint listed in docs/brand.md and
 * this test together.
 */
const FORBIDDEN = ["گود تیم", "گود این"];

describe("Persian brand form", () => {
  it("no fa message uses a rejected form", () => {
    const hits: string[] = [];
    for (const [ns, table] of Object.entries(messages.fa))
      for (const [key, value] of Object.entries(table as Record<string, string>))
        for (const bad of FORBIDDEN) if (value.includes(bad)) hits.push(`${ns}.${key}: ${bad}`);
    expect(hits).toEqual([]);
  });

  it("the brand family uses the «گودین» root", () => {
    expect(messages.fa.common.appName).toBe("گودین تیم");
    expect(messages.fa.nav.brandTeam).toBe("گودین تیم");
    expect(messages.fa.nav.brandStudio).toBe("گودین استودیو");
    expect(messages.fa.nav.brandCode).toBe("گودین کد");
    expect(messages.en.common.appName).toBe("Good In Team");
  });
});
