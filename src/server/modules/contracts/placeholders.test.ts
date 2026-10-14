import { describe, expect, it } from "vitest";
import {
  detectDocLocale,
  extractPlaceholders,
  fillPlaceholders,
  highlightPlaceholdersHtml,
} from "./placeholders";
import { STARTER_TEMPLATES } from "./starters";

describe("extractPlaceholders", () => {
  it("finds unique dotted keys in order, tolerating inner spaces", () => {
    expect(
      extractPlaceholders("{{client.name}} & {{ project.dueDate }} — {{client.name}} {{today}}"),
    ).toEqual(["client.name", "project.dueDate", "today"]);
  });

  it("ignores malformed braces", () => {
    expect(extractPlaceholders("{{}} {{1abc}} {client.name} {{a..b}}")).toEqual([]);
  });
});

describe("fillPlaceholders", () => {
  it("replaces known keys and keeps unknown/empty ones visible", () => {
    const { text, unresolved } = fillPlaceholders(
      "Between {{brand.name}} and {{client.name}}; fee {{project.budget}}; {{custom.note}}",
      { "brand.name": "Good Team", "client.name": "Acme", "project.budget": "  " },
    );
    expect(text).toBe("Between Good Team and Acme; fee {{project.budget}}; {{custom.note}}");
    expect(unresolved).toEqual(["project.budget", "custom.note"]);
  });

  it("is idempotent once everything is filled", () => {
    const once = fillPlaceholders("{{a}} {{b.c}}", { a: "1", "b.c": "2" }).text;
    expect(fillPlaceholders(once, {}).text).toBe("1 2");
  });

  it("does not re-expand placeholders contained in values", () => {
    expect(fillPlaceholders("{{a}}", { a: "{{b}}", b: "x" }).text).toBe("{{b}}");
  });

  it("fills Persian text with Persian values", () => {
    expect(
      fillPlaceholders("طرف دوم: **{{client.name}}** — تاریخ {{today}}", {
        "client.name": "آکادمی آکمه",
        today: "۲۲ مهر ۱۴۰۵",
      }).text,
    ).toBe("طرف دوم: **آکادمی آکمه** — تاریخ ۲۲ مهر ۱۴۰۵");
  });
});

describe("highlightPlaceholdersHtml", () => {
  it("marks leftovers in text but not in code or attributes", () => {
    const html =
      '<p>Hi {{client.name}}</p><pre><code>{{keep}}</code></pre><a href="{{url}}">x</a><code>{{c}}</code>';
    const out = highlightPlaceholdersHtml(html);
    expect(out).toContain(
      '<p>Hi <mark class="gt-placeholder" data-placeholder>{{client.name}}</mark></p>',
    );
    expect(out).toContain("<pre><code>{{keep}}</code></pre>");
    expect(out).toContain('<a href="{{url}}">x</a>');
    expect(out).toContain("<code>{{c}}</code>");
  });
});

describe("detectDocLocale", () => {
  it("detects Persian vs English documents", () => {
    expect(detectDocLocale("# قرارداد طراحی\n\nبا {{client.name}}")).toBe("fa");
    expect(detectDocLocale("# Agreement between {{brand.name}} and {{client.name}}")).toBe("en");
    expect(detectDocLocale("# قرارداد React Native app")).toBe("fa");
  });
});

describe("describeUserAgent", () => {
  it("summarizes common browsers", async () => {
    const { describeUserAgent } = await import("./user-agent");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome · Android");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari · iOS");
    expect(describeUserAgent(null)).toBeNull();
    expect(describeUserAgent("curl/8.0")).toBe("curl/8.0");
  });
});

describe("starter templates", () => {
  it("ship fa + en starters that only use well-formed placeholders", () => {
    const locales = new Set(STARTER_TEMPLATES.map((s) => s.locale));
    expect(locales).toEqual(new Set(["fa", "en"]));
    for (const s of STARTER_TEMPLATES) {
      expect(detectDocLocale(s.bodyMd)).toBe(s.locale);
      expect(s.bodyMd).not.toMatch(/\{\{[^}]*\{\{/);
      expect(extractPlaceholders(s.bodyMd)).toContain("client.name");
    }
  });
});
