import { describe, expect, it } from "vitest";
import { brandIds, subBrandIds, type BrandId, type SubBrandId } from "@/components/brand/brands";
import { guide as en } from "@/i18n/messages/en/guide";
import { guide as fa } from "@/i18n/messages/fa/guide";

/**
 * The guide's lines (spec §9 coverage map, §10.3, §14): spoken aloud and shown
 * in a 300px bubble, so they stay short; fa and en share every key and
 * placeholder; the Persian brand form is «گودین».
 */
const keys = Object.keys(fa) as (keyof typeof fa)[];
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

/** Every key of the §9 "Guide coverage" map, placed by home, site-pages, site-shell and CtaBand. */
const COVERAGE = [
  "home_hero",
  "spot_diagram",
  "home_brands",
  "home_trust",
  "home_work",
  "home_services",
  "home_process",
  "home_process_portal",
  "home_process_progress",
  "home_process_contracts",
  "home_process_invoices",
  "home_stats",
  "home_latest",
  "home_testimonials",
  "home_cta",
  "footer",
  "cta",
  "work_index",
  "work_grid",
  "work_detail",
  "work_story",
  "services_index",
  "services_process",
  "services_faq",
  "service_detail",
  "service_body",
  "service_faq",
  "blog_index",
  "blog_grid",
  "post_detail",
  "post_body",
  "post_share",
  "learn_index",
  "learn_grid",
  "course",
  "course_lessons",
  "lesson",
  "lesson_body",
  "lesson_nav",
  "about",
  "about_values",
  "about_stats",
  "brand_family",
  "contact",
  "not_found",
] as const;

describe("guide copy", () => {
  it("has identical keys and placeholders in fa and en", () => {
    expect(Object.keys(en).sort()).toEqual([...keys].sort());
    for (const k of keys) expect(placeholders(en[k]), k).toBe(placeholders(fa[k]));
  });

  it("covers every box of the public site, one line per brand box included", () => {
    for (const k of COVERAGE) {
      expect(fa[k], k).toBeTruthy();
      expect(en[k], k).toBeTruthy();
    }
    for (const id of brandIds) {
      const k: `services_brand_${BrandId}` = `services_brand_${id}`;
      expect(fa[k], k).toBeTruthy();
    }
    // brand landing pages (/studio, /code): the hero and the services box
    for (const id of subBrandIds) {
      const hero: `brand_${SubBrandId}` = `brand_${id}`;
      const services: `brand_services_${SubBrandId}` = `brand_services_${id}`;
      for (const k of [hero, services]) {
        expect(fa[k], k).toBeTruthy();
        expect(en[k], k).toBeTruthy();
      }
    }
  });

  it("keeps lines short enough to read aloud (fa ≤140, en ≤160 characters)", () => {
    for (const k of keys) {
      expect(fa[k].length, `fa.${k}`).toBeLessThanOrEqual(140);
      expect(en[k].length, `en.${k}`).toBeLessThanOrEqual(160);
    }
  });

  it("uses the Persian brand form «گودین»", () => {
    for (const k of keys) {
      expect(fa[k], k).not.toMatch(/گود\s?(تیم|این)|Good In/);
    }
  });

  it("formats the compact greeting without promising automatic explanations", () => {
    for (const g of [en.greetingCompact, en.greetingCompactNoName]) {
      expect(g).toMatch(/"!"/);
      expect(g).not.toMatch(/as you reach/i);
    }
    for (const g of [fa.greetingCompact, fa.greetingCompactNoName]) {
      expect(g).toContain("«!»");
      expect(g).not.toContain("به هر بخش که برسی");
    }
  });
});
