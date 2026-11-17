/**
 * Content service against a throwaway SQLite database (real migrations):
 * a service's Good In brand is shared by its translation siblings (spec §2).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/actor";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-content-"));
process.env.DATA_DIR = dir;
process.env.APP_TIMEZONE = "Asia/Tehran";

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { eq } = await import("drizzle-orm");
const svc = await import("./service");
const { postInput, updatePostInput } = await import("./schemas");

let owner: Actor;
const ids: Record<string, string> = {};

const metaOf = (id: string) =>
  db.select({ meta: s.posts.meta }).from(s.posts).where(eq(s.posts.id, id)).get()!.meta as Record<
    string,
    unknown
  >;
const update = (raw: Record<string, unknown>) => svc.updatePost(owner, updatePostInput.parse(raw));

beforeAll(() => {
  const u = db
    .insert(s.users)
    .values({ email: "o@x.test", name: "Owner", role: "owner" })
    .returning()
    .get();
  owner = {
    via: "session",
    scopes: ["read", "write", "admin"],
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      role: "owner",
      clientId: null,
      locale: "fa",
      avatarUrl: null,
      title: null,
    },
  };
  const create = (raw: Record<string, unknown>) => svc.createPost(owner, postInput.parse(raw));
  ids.fa = create({
    type: "service",
    locale: "fa",
    title: "طراحی",
    slug: "design",
    translationKey: "svc-x",
    meta: { icon: "palette", brand: "code" },
  }).id;
  ids.en = create({
    type: "service",
    locale: "en",
    title: "Design",
    slug: "design",
    translationKey: "svc-x",
    meta: { icon: "palette" },
  }).id;
  // A non-service post that happens to share the translation key.
  ids.article = create({
    type: "article",
    locale: "en",
    title: "Notes",
    slug: "notes",
    translationKey: "svc-x",
    meta: { brand: "code" },
  }).id;
});

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("service brand sync across translationKey siblings", () => {
  it("setting the brand on the fa row sets it on the en row", () => {
    update({ id: ids.fa, meta: { brand: "studio" } });
    expect(metaOf(ids.fa).brand).toBe("studio");
    expect(metaOf(ids.en).brand).toBe("studio");
    expect(metaOf(ids.en).icon).toBe("palette"); // other meta untouched
  });

  it("creating a service with a brand syncs it to existing siblings", () => {
    const tr = svc.createPost(
      owner,
      postInput.parse({
        type: "service",
        locale: "en",
        title: "Design 2",
        slug: "design-2",
        translationKey: "svc-x",
        meta: { brand: "team" },
      }),
    );
    expect(metaOf(ids.fa).brand).toBe("team");
    expect(metaOf(ids.en).brand).toBe("team");
    update({ id: tr.id, meta: { brand: "studio" } });
  });

  it("an update whose meta has no brand key leaves both rows unchanged", () => {
    update({ id: ids.en, meta: { icon: "bot" } });
    expect(metaOf(ids.en).brand).toBe("studio");
    expect(metaOf(ids.fa).brand).toBe("studio");
    update({ id: ids.en, title: "Design!" });
    expect(metaOf(ids.fa).brand).toBe("studio");
  });

  it('clearing with "" (the editor\'s None) clears both rows', () => {
    const parsed = updatePostInput.parse({ id: ids.fa, meta: { brand: "" } });
    expect("brand" in parsed.meta!).toBe(true);
    expect(parsed.meta!.brand).toBeUndefined();
    svc.updatePost(owner, parsed);
    expect(metaOf(ids.fa)).not.toHaveProperty("brand");
    expect(metaOf(ids.en)).not.toHaveProperty("brand");
  });

  it("never touches a non-service post with the same translationKey", () => {
    update({ id: ids.fa, meta: { brand: "code" } });
    expect(metaOf(ids.en).brand).toBe("code");
    expect(metaOf(ids.article).brand).toBe("code"); // its own value from creation
    update({ id: ids.fa, meta: { brand: "studio" } });
    expect(metaOf(ids.article).brand).toBe("code");
  });

  it("a partial update keeps type, locale, status and body", () => {
    const before = db.select().from(s.posts).where(eq(s.posts.id, ids.en)).get()!;
    update({ id: ids.en, title: "Design (en)" });
    const after = db.select().from(s.posts).where(eq(s.posts.id, ids.en)).get()!;
    expect([after.type, after.locale, after.status, after.contentMd]).toEqual([
      before.type,
      before.locale,
      before.status,
      before.contentMd,
    ]);
  });

  it("rejects an unknown brand", () => {
    expect(() => updatePostInput.parse({ id: ids.fa, meta: { brand: "nope" } })).toThrow();
  });
});
