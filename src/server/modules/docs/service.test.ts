/**
 * Docs service against a throwaway SQLite database (real migrations): a partial
 * update changes only what was sent, and who may edit / manage a page.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/actor";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-docs-"));
process.env.DATA_DIR = dir;
process.env.APP_TIMEZONE = "Asia/Tehran";

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { eq } = await import("drizzle-orm");
const { callTool } = await import("@/server/api/registry");
const svc = await import("./service");
const { docInput, updateDocInput } = await import("./schemas");

const actor = (u: { id: string; role: Actor["user"]["role"] }): Actor => ({
  via: "session",
  scopes: ["read", "write", "admin"],
  user: {
    id: u.id,
    email: `${u.id}@x.test`,
    name: u.id,
    role: u.role,
    clientId: null,
    locale: "fa",
    avatarUrl: null,
    title: null,
  },
});

let owner: Actor;
let member: Actor;
let colleague: Actor;

const BODY = "# Deploy\n\nStep 1…";
const row = (id: string) => db.select().from(s.docs).where(eq(s.docs.id, id)).get()!;
const teamPage = (author: Actor, title = "Runbook") =>
  svc.createDoc(author, docInput.parse({ title, contentMd: BODY, visibility: "team" })).id;

/**
 * What the editor sends when the user may not manage the page
 * (`components/docs/doc-editor.tsx`): every field except `visibility`.
 */
const editorSave = (id: string, patch: { title?: string; contentMd: string }) => ({
  id,
  title: patch.title ?? row(id).title,
  icon: null,
  contentMd: patch.contentMd,
  parentId: null,
  projectId: null,
  clientId: null,
});

beforeAll(() => {
  const users = db
    .insert(s.users)
    .values([
      { email: "o@x.test", name: "Owner", role: "owner" },
      { email: "m@x.test", name: "Member", role: "member" },
      { email: "c@x.test", name: "Colleague", role: "member" },
    ])
    .returning()
    .all();
  owner = actor({ id: users[0]!.id, role: "owner" });
  member = actor({ id: users[1]!.id, role: "member" });
  colleague = actor({ id: users[2]!.id, role: "member" });
});

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("partial updates", () => {
  it("the docs_update tool with only a title keeps the body and the visibility", async () => {
    const id = teamPage(owner);
    await callTool({ ...owner, via: "api" }, "docs_update", { id, title: "Runbook v2" });
    expect(row(id)).toMatchObject({ title: "Runbook v2", contentMd: BODY, visibility: "team" });
  });

  it("the service changes only the fields that were sent", () => {
    const id = teamPage(owner);
    const before = row(id);
    svc.updateDoc(owner, updateDocInput.parse({ id, icon: "📘" }));
    const after = row(id);
    expect(after.icon).toBe("📘");
    const rest = (r: typeof before) => ({ ...r, icon: null, updatedAt: null, updatedBy: null });
    expect(rest(after)).toEqual(rest(before));
  });

  it("an {id}-only update changes nothing but who touched the page last", () => {
    const id = teamPage(owner);
    svc.updateDoc(member, updateDocInput.parse({ id }));
    expect(row(id)).toMatchObject({
      title: "Runbook",
      contentMd: BODY,
      visibility: "team",
      updatedBy: member.user.id,
    });
  });

  it('"" clears the icon; an explicit empty body is still an edit', () => {
    const id = svc.createDoc(
      owner,
      docInput.parse({ title: "Notes", icon: "📝", contentMd: BODY }),
    ).id;
    svc.updateDoc(owner, updateDocInput.parse({ id, icon: "", contentMd: "" }));
    expect(row(id)).toMatchObject({ icon: null, contentMd: "", visibility: "private" });
  });
});

describe("who may edit a team page", () => {
  it("a member who is not the author can save a body edit to a colleague's team page", () => {
    const id = teamPage(colleague, "Team wiki");
    const parsed = updateDocInput.parse(editorSave(id, { contentMd: "v2 by member" }));
    // Used to answer 403: the schema filled in `visibility: "private"`, which
    // the service read as a non-manager changing who sees the page.
    svc.updateDoc(member, parsed);
    expect(row(id)).toMatchObject({
      contentMd: "v2 by member",
      visibility: "team",
      createdBy: colleague.user.id,
      updatedBy: member.user.id,
    });
    expect("visibility" in parsed).toBe(false);
  });

  it("sending the page's current visibility is not a visibility change", () => {
    const id = teamPage(colleague);
    svc.updateDoc(member, updateDocInput.parse({ id, title: "Renamed", visibility: "team" }));
    expect(row(id)).toMatchObject({ title: "Renamed", visibility: "team" });
  });

  it("only the author or an admin can change who sees the page", () => {
    const id = teamPage(colleague);
    const change = updateDocInput.parse({ id, visibility: "private" });
    expect(() => svc.updateDoc(member, change)).toThrowError(
      expect.objectContaining({ code: "forbidden" }),
    );
    expect(row(id).visibility).toBe("team");
    svc.updateDoc(colleague, change); // the author
    expect(row(id).visibility).toBe("private");
    svc.updateDoc(colleague, updateDocInput.parse({ id, visibility: "team" }));
    svc.updateDoc(owner, change); // an admin
    expect(row(id).visibility).toBe("private");
  });

  it("a private page stays invisible to other staff, so they can't edit it", () => {
    const id = svc.createDoc(colleague, docInput.parse({ title: "Draft" })).id;
    expect(row(id).visibility).toBe("private"); // the create default still applies
    expect(() => svc.updateDoc(member, updateDocInput.parse({ id, title: "x" }))).toThrowError(
      expect.objectContaining({ code: "not_found" }),
    );
  });
});
