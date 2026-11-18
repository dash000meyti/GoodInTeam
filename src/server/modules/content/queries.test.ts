/**
 * Public content queries against a throwaway SQLite database: the owner's
 * posts carry the profile's owner name in the post's language (users.name is
 * one language); other authors keep their account name.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
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

describe("cached queries are public endpoints", () => {
  const post = () => db.select().from(s.posts).where(eq(s.posts.title, "Hello")).get()!;

  it("renders a post by id and version, never from text the caller supplies", async () => {
    db.update(s.posts)
      .set({ contentMd: "## Body\n\nHi <b>there</b> <script>window.x = 1</script>" })
      .where(eq(s.posts.title, "Hello"))
      .run();
    const p = post();
    const out = await q.renderPost(p.id, p.updatedAt.getTime());
    expect(out?.html).toContain("Hi <b>there</b>");
    expect(out?.html).not.toContain("script");
    expect(out?.headings).toEqual([{ depth: 2, text: "Body", id: "body" }]);
    // The body always comes from the row that is public now.
    expect((await q.renderPost(p.id, 0))?.html).toBe(out?.html);
    expect((await q.renderPostBody(p)).html).toBe(out?.html);
  });

  it("renders nothing for a post that is not public", async () => {
    const draft = db
      .insert(s.posts)
      .values({ slug: "draft", locale: "en", title: "Draft", contentMd: "secret draft" })
      .returning()
      .get();
    expect(await q.renderPost(draft.id, draft.updatedAt.getTime())).toBeNull();
    expect(await q.renderPost("nosuchpost000000", 1)).toBeNull();
    expect(await q.renderPostBody(draft)).toEqual({ html: "", headings: [] });
    const scheduled = db
      .insert(s.posts)
      .values({
        slug: "soon",
        locale: "en",
        title: "Soon",
        contentMd: "not yet",
        status: "scheduled",
        publishedAt: new Date(Date.now() + 86_400_000),
      })
      .returning()
      .get();
    expect(await q.renderPost(scheduled.id, scheduled.updatedAt.getTime())).toBeNull();
    expect(await q.getSyndicationLinks(draft.id)).toEqual([]);
  });

  it("shows where a post was shared only while the post is public", async () => {
    const p = post();
    const draft = db.select().from(s.posts).where(eq(s.posts.slug, "draft")).get()!;
    db.insert(s.syndications)
      .values([
        { postId: p.id, network: "x", status: "posted", externalUrl: "https://x.example/1" },
        { postId: draft.id, network: "x", status: "posted", externalUrl: "https://x.example/2" },
      ])
      .run();
    expect(await q.getSyndicationLinks(p.id)).toEqual([
      { network: "x", url: "https://x.example/1" },
    ]);
    expect(await q.getSyndicationLinks(draft.id)).toEqual([]);
  });

  it("refuses junk arguments before doing any work", async () => {
    const junk: (() => Promise<unknown>)[] = [
      () => q.renderPost("# markdown\n\n```ts\nx\n```" as string, 0),
      () => q.renderPost("abc", "1" as unknown as number),
      () => q.listServices("de" as never),
      () => q.listTags("en", ["nope"] as never),
      () => q.listWorkFacets({} as never),
      () => q.getTranslations("a b"),
      () => q.getSyndicationLinks("x".repeat(100)),
      () => q.listSeries(null as never),
      () => q.listTestimonials("en", 5000),
      () => q.getTestimonialForProject("a;b", "en"),
      () => q.listPublicClientNames("xx" as never),
      () => q.listFullPosts("en", ["article"], 1000),
      () => q.listFullPosts(null as never, ["article"], 10),
      () => q.getRelated({ id: "a", locale: "en", tags: [] }, ["article"], 1e6),
      () =>
        q.getAdjacent({
          id: "a",
          locale: "en",
          types: ["article"],
          publishedAt: null,
          createdAt: "now" as never,
        }),
    ];
    for (const call of junk) await expect(call()).rejects.toThrow(/Invalid arguments/);
  });

  it("answers impossible values from the URL without an error", async () => {
    const base = { locale: "en" as const, types: ["article" as const] };
    const empty = { items: [], total: 0, page: 1, pages: 1 };
    expect(await q.listPublished({ ...base, tag: "x".repeat(500) })).toMatchObject(empty);
    expect(await q.listPublished({ ...base, stack: "x".repeat(500) })).toMatchObject(empty);
    expect(await q.listPublished({ ...base, year: 99999 })).toMatchObject(empty);
    // Search text is cut, page and page size are clamped.
    const list = await q.listPublished({ ...base, q: "h".repeat(5000), page: 1e12, pageSize: 1e6 });
    expect(list.pageSize).toBe(100);
    expect(list.page).toBe(1);
    expect((await q.listPublished({ ...base, page: NaN, pageSize: NaN })).items.length).toBe(2);
    expect(await q.getPublishedPost("en", ["article"], "x".repeat(5000))).toBeNull();
    expect(await q.getPublishedPost("en", ["article"], "")).toBeNull();
    expect(await q.getSeriesWithLessons("en", "x".repeat(5000))).toBeNull();
  });

  it("lists every post for llms-full without taking a limit", async () => {
    const all = await q.listAllFullPosts();
    expect(all.map((p) => p.slug).sort()).toEqual(["guest", "hello", "hello"]);
  });
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
