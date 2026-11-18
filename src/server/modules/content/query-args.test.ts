import { describe, expect, it } from "vitest";
import { MAX_LABEL, MAX_LIMIT, MAX_QUERY_TEXT, MAX_SLUG, checkArgs, queryArgs } from "./query-args";

const ok = (schema: Parameters<typeof checkArgs>[0], value: unknown) =>
  expect(() => checkArgs(schema, value)).not.toThrow();
const refused = (schema: Parameters<typeof checkArgs>[0], value: unknown) =>
  expect(() => checkArgs(schema, value), JSON.stringify(value)).toThrow(/Invalid arguments/);

describe("arguments of the cached content queries", () => {
  it("accepts what the site passes", () => {
    ok(queryArgs.locale, "fa");
    ok(queryArgs.localeAndTypes, ["en", ["article", "vlog", "note"]]);
    ok(queryArgs.list, {
      locale: "fa",
      types: ["work"],
      stack: "Next.js",
      year: 2026,
      page: 2,
      pageSize: 12,
    });
    ok(queryArgs.list, {
      locale: "en",
      types: ["article"],
      q: "سلام",
      tag: undefined,
      orderBy: "sort",
    });
    ok(queryArgs.postBySlug, ["fa", ["article", "vlog", "note"], "راهنمای-شروع"]);
    ok(queryArgs.seriesBySlug, ["en", "nextjs-zero-to-deploy"]);
    ok(queryArgs.rowId, "fekm18msc2d7awys");
    ok(queryArgs.optionalRowId, null);
    ok(queryArgs.optionalRowId, "svc-web");
    ok(queryArgs.adjacent, {
      id: "a1b2c3d4",
      locale: "fa",
      types: ["work"],
      publishedAt: null,
      createdAt: new Date(),
    });
    ok(queryArgs.related, [
      { id: "a1b2c3d4", locale: "en", tags: ["next", "sqlite"] },
      ["article"],
      3,
    ]);
    ok(queryArgs.localeAndLimit, ["fa", 12]);
    ok(queryArgs.projectTestimonial, [null, "en"]);
    ok(queryArgs.fullPosts, ["en", ["article", "tutorial"], 40]);
    ok(queryArgs.postVersion, ["fekm18msc2d7awys", Date.now()]);
  });

  it("refuses unknown locales and types", () => {
    for (const locale of ["de", "", "FA", null, undefined, 1, {}, ["fa"]])
      refused(queryArgs.locale, locale);
    refused(queryArgs.localeAndTypes, ["fa", []]);
    refused(queryArgs.localeAndTypes, ["fa", ["article", "secret"]]);
    refused(queryArgs.localeAndTypes, ["fa", "article"]);
    refused(queryArgs.localeAndTypes, ["fa", Array(50).fill("article")]);
  });

  it("refuses free-form or oversized text", () => {
    const base = { locale: "fa", types: ["article"] };
    refused(queryArgs.list, { ...base, q: "x".repeat(MAX_QUERY_TEXT + 1) });
    refused(queryArgs.list, { ...base, tag: "x".repeat(MAX_LABEL + 1) });
    refused(queryArgs.list, { ...base, stack: "x".repeat(MAX_LABEL + 1) });
    refused(queryArgs.list, { ...base, q: 5 });
    refused(queryArgs.list, { ...base, q: { $ne: "" } });
    refused(queryArgs.postBySlug, ["fa", ["article"], "x".repeat(MAX_SLUG + 1)]);
    refused(queryArgs.postBySlug, ["fa", ["article"], ""]);
    refused(queryArgs.seriesBySlug, ["fa", ["not", "a", "string"]]);
  });

  it("refuses limits and numbers outside their range", () => {
    const base = { locale: "fa", types: ["article"] };
    for (const pageSize of [0, -1, MAX_LIMIT + 1, 1e9, 1.5, "10", NaN, Infinity]) {
      refused(queryArgs.list, { ...base, pageSize });
    }
    for (const page of [0, -3, 1e9, 2.5, "2"]) refused(queryArgs.list, { ...base, page });
    for (const year of [0, 1899, 2201, 2026.5, "2026"]) refused(queryArgs.list, { ...base, year });
    for (const limit of [0, MAX_LIMIT + 1, 1000, -1, 3.3]) {
      refused(queryArgs.localeAndLimit, ["fa", limit]);
      refused(queryArgs.fullPosts, ["fa", ["article"], limit]);
      refused(queryArgs.related, [{ id: "a1", locale: "fa", tags: [] }, ["article"], limit]);
    }
    refused(queryArgs.list, { ...base, orderBy: "random()" });
  });

  it("accepts ids by shape only", () => {
    for (const id of ["", "a b", "a'b", "../x", "x".repeat(65), "آی‌دی", 12, null, { id: "a" }]) {
      refused(queryArgs.rowId, id);
      refused(queryArgs.postVersion, [id, 1]);
    }
    refused(queryArgs.optionalRowId, "a;b");
    refused(queryArgs.postVersion, ["abc", -1]);
    refused(queryArgs.postVersion, ["abc", 1.5]);
    refused(queryArgs.postVersion, ["abc", "1"]);
    refused(queryArgs.postVersion, ["abc"]);
    // The old shape of the renderer (free-form text) is not an id.
    refused(queryArgs.postVersion, ["# any markdown\n\n```ts\nconst a = 1\n```", 0]);
  });

  it("refuses malformed post references", () => {
    const post = {
      id: "a1b2",
      locale: "fa",
      types: ["work"],
      publishedAt: null,
      createdAt: new Date(),
    };
    refused(queryArgs.adjacent, { ...post, createdAt: "2026-01-01" });
    refused(queryArgs.adjacent, { ...post, createdAt: new Date("nope") });
    refused(queryArgs.adjacent, { ...post, id: "a b" });
    refused(queryArgs.related, [
      { id: "a1", locale: "fa", tags: Array(51).fill("t") },
      ["article"],
      3,
    ]);
    refused(queryArgs.related, [
      { id: "a1", locale: "fa", tags: ["x".repeat(MAX_LABEL + 1)] },
      ["article"],
      3,
    ]);
  });
});
