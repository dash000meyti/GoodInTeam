/**
 * Public content queries against a throwaway SQLite database: the owner's
 * posts carry the profile's owner name in the post's language (users.name is
 * one language); other authors keep their account name.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {} }));

const dir = mkdtempSync(path.join(tmpdir(), "gt-content-q-"));
process.env.DATA_DIR = dir;
process.env.APP_TIMEZONE = "Asia/Tehran";

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { saveSettings } = await import("@/server/modules/settings/service");
const q = await import("./queries");

const past = new Date(Date.now() - 86_400_000);
db.insert(s.users)
  .values([
    { id: "u-owner", email: "owner@x.test", name: "مهدی رضایی", role: "owner" },
    { id: "u-member", email: "member@x.test", name: "سارا", role: "member" },
  ])
  .run();
db.insert(s.posts)
  .values([
    { slug: "hello", locale: "fa", title: "سلام", authorId: "u-owner" },
    { slug: "hello", locale: "en", title: "Hello", authorId: "u-owner" },
    { slug: "guest", locale: "en", title: "Guest", authorId: "u-member" },
  ])
  .run();
db.update(s.posts).set({ status: "published", publishedAt: past }).run();

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("post author names", () => {
  it("falls back to the account name without a profile name", async () => {
    expect((await q.getPublishedPost("en", ["article"], "hello"))?.authorName).toBe("مهدی رضایی");
  });

  it("uses the profile's owner name in the post's language", async () => {
    saveSettings("profile", { ownerName: { fa: "مهدی رضایی", en: "Mahdi Rezaei" } });
    expect((await q.getPublishedPost("en", ["article"], "hello"))?.authorName).toBe("Mahdi Rezaei");
    expect((await q.getPublishedPost("fa", ["article"], "hello"))?.authorName).toBe("مهدی رضایی");
    const feed = await q.listFullPosts("en", ["article"]);
    expect(Object.fromEntries(feed.map((p) => [p.slug, p.authorName]))).toEqual({
      hello: "Mahdi Rezaei",
      guest: "سارا",
    });
    expect(feed.every((p) => !("authorRole" in p))).toBe(true);
  });
});
