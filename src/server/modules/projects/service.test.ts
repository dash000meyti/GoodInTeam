/**
 * Projects service against a throwaway SQLite database (real migrations):
 * partial-update semantics, clearing fields, and what each role may see.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/actor";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-projects-"));
process.env.DATA_DIR = dir;
process.env.APP_TIMEZONE = "Asia/Tehran";

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { eq } = await import("drizzle-orm");
const svc = await import("./service");
const { updateMilestoneInput, updateProjectInput } = await import("./schemas");
const { updateClientInput } = await import("../clients/schemas");
const clientsSvc = await import("../clients/service");

const actor = (u: {
  id: string;
  role: Actor["user"]["role"];
  clientId?: string | null;
}): Actor => ({
  via: "session",
  scopes: ["read", "write", "admin"],
  user: {
    id: u.id,
    email: `${u.id}@x.test`,
    name: u.id,
    role: u.role,
    clientId: u.clientId ?? null,
    locale: "fa",
    avatarUrl: null,
    title: null,
  },
});

let owner: Actor;
let member: Actor;
let clientUser: Actor;
const ids: Record<string, string> = {};
const HOUR = 3_600_000;

beforeAll(() => {
  const acme = db
    .insert(s.clients)
    .values({ name: "Acme", notes: "secret notes", taxId: "TAX-1", kind: "team" })
    .returning()
    .get();
  const users = db
    .insert(s.users)
    .values([
      { email: "o@x.test", name: "Owner", role: "owner" },
      { email: "m@x.test", name: "Member", role: "member" },
      { email: "c@x.test", name: "Client", role: "client", clientId: acme.id },
    ])
    .returning()
    .all();
  owner = actor({ id: users[0]!.id, role: "owner" });
  member = actor({ id: users[1]!.id, role: "member" });
  clientUser = actor({ id: users[2]!.id, role: "client", clientId: acme.id });
  ids.acme = acme.id;

  const [hidden, shared, other] = db
    .insert(s.projects)
    .values([
      {
        name: "Hidden stats",
        slug: "hidden-stats",
        clientId: acme.id,
        portalEnabled: true,
        shareProgress: false,
        shareTime: false,
        progress: 40,
        progressMode: "manual",
        currency: "USD",
        budgetMinor: 500_000,
        hourlyRateMinor: 5_000,
        estimateHours: 80,
        repoUrl: "https://git.example/hidden",
        tags: ["internal"],
        shareToken: "tok-hidden-0123456789",
        status: "paused",
        billingType: "fixed",
      },
      {
        name: "Shared stats",
        slug: "shared-stats",
        clientId: acme.id,
        portalEnabled: true,
        shareProgress: true,
        shareTime: true,
        progress: 70,
        progressMode: "manual",
      },
      { name: "Other", slug: "other" },
    ])
    .returning()
    .all();
  ids.hidden = hidden!.id;
  ids.shared = shared!.id;
  ids.other = other!.id;
  db.insert(s.projectMembers)
    .values({ projectId: hidden!.id, userId: member.user.id, hourlyCostMinor: 9_999 })
    .run();

  const start = Date.parse("2026-10-01T06:00:00Z");
  db.insert(s.timeEntries)
    .values([
      {
        userId: owner.user.id,
        projectId: hidden!.id,
        startedAt: new Date(start),
        endedAt: new Date(start + 2 * HOUR),
      },
      {
        userId: owner.user.id,
        projectId: shared!.id,
        startedAt: new Date(start),
        endedAt: new Date(start + 3 * HOUR),
      },
    ])
    .run();
  ids.milestone = db
    .insert(s.milestones)
    .values({ projectId: hidden!.id, title: "Internal", visibleToClient: false, weight: 3 })
    .returning()
    .get().id;
  db.insert(s.milestones)
    .values({ projectId: hidden!.id, title: "Public", visibleToClient: true })
    .run();
});

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

const row = (id: string) => db.select().from(s.projects).where(eq(s.projects.id, id)).get()!;
const update = (input: Record<string, unknown>) =>
  svc.updateProject(owner, updateProjectInput.parse(input));

describe("partial updates", () => {
  it("{id, name} only changes the name (and slug)", () => {
    const before = row(ids.hidden!);
    update({ id: ids.hidden, name: "Hidden stats v2" });
    const after = row(ids.hidden!);
    expect(after.name).toBe("Hidden stats v2");
    expect(after.slug).toBe("hidden-stats-v2");
    // Everything except name/slug/updatedAt is unchanged.
    const others = (r: typeof before) => ({ ...r, name: "", slug: "", updatedAt: null });
    expect(others(after)).toEqual(others(before));
  });

  it("keeps the slug when the name doesn't change", () => {
    update({ id: ids.hidden, name: "Hidden stats v2", status: "active" });
    expect(row(ids.hidden!).slug).toBe("hidden-stats-v2");
    expect(row(ids.hidden!).status).toBe("active");
  });

  it("toggling one share flag leaves the others alone", () => {
    update({ id: ids.hidden, shareDocs: "true" });
    const r = row(ids.hidden!);
    expect(r.shareDocs).toBe(true);
    expect(r.shareProgress).toBe(false);
    expect(r.shareTime).toBe(false);
    expect(r.portalEnabled).toBe(true);
    expect(r.currency).toBe("USD");
    expect(r.billingType).toBe("fixed");
  });

  it("money uses the project's current currency when none is sent", () => {
    update({ id: ids.hidden, budget: "1,250.50" });
    expect(row(ids.hidden!).budgetMinor).toBe(125_050); // USD cents, not IRT
  });

  it("changing only the currency keeps the major-unit amounts", () => {
    update({ id: ids.hidden, currency: "IRT" });
    const r = row(ids.hidden!);
    expect(r.currency).toBe("IRT");
    expect(r.budgetMinor).toBe(1251); // 1250.50 USD → 1251 (IRT has no decimals)
    expect(r.hourlyRateMinor).toBe(50);
    update({ id: ids.hidden, currency: "USD", budget: "5000", hourlyRate: "50" });
  });

  it("empty form values / null clear dates, money and estimate", () => {
    update({ id: ids.hidden, startDate: "2026-10-01", dueDate: "2026-12-31" });
    expect(row(ids.hidden!).dueDate).not.toBeNull();
    update({ id: ids.hidden, startDate: "", dueDate: "", budget: "", estimateHours: "" });
    let r = row(ids.hidden!);
    expect(r.startDate).toBeNull();
    expect(r.dueDate).toBeNull();
    expect(r.budgetMinor).toBeNull();
    expect(r.estimateHours).toBeNull();
    expect(r.hourlyRateMinor).toBe(5_000); // absent → untouched
    update({ id: ids.hidden, hourlyRate: null });
    r = row(ids.hidden!);
    expect(r.hourlyRateMinor).toBeNull();
    update({ id: ids.hidden, budget: "5000", hourlyRate: "50", estimateHours: "80" });
  });

  it("an {id}-only update is a harmless no-op", () => {
    const before = row(ids.hidden!);
    update({ id: ids.hidden });
    expect(row(ids.hidden!).name).toBe(before.name);
  });

  it("milestone status toggle keeps visibleToClient / weight", () => {
    svc.updateMilestone(owner, updateMilestoneInput.parse({ id: ids.milestone, status: "done" }));
    const m = db.select().from(s.milestones).where(eq(s.milestones.id, ids.milestone!)).get()!;
    expect(m.status).toBe("done");
    expect(m.visibleToClient).toBe(false);
    expect(m.weight).toBe(3);
    expect(m.completedAt).not.toBeNull();
  });

  it("a partial client update keeps kind and currency", () => {
    clientsSvc.updateClient(owner, updateClientInput.parse({ id: ids.acme, name: "Acme Inc" }));
    const c = db.select().from(s.clients).where(eq(s.clients.id, ids.acme!)).get()!;
    expect(c.name).toBe("Acme Inc");
    expect(c.kind).toBe("team");
    expect(c.notes).toBe("secret notes");
  });
});

describe("what each role sees", () => {
  it("client: no time/progress unless shared, no money or internal fields", async () => {
    const list = await svc.listProjects(clientUser);
    const hidden = list.find((p) => p.id === ids.hidden)!;
    const shared = list.find((p) => p.id === ids.shared)!;
    expect(list.map((p) => p.id).sort()).toEqual([ids.hidden, ids.shared].sort());
    expect(hidden.trackedMs).toBeNull();
    expect(hidden.progress).toBeNull();
    expect(hidden.estimateHours).toBeNull();
    expect(hidden.budgetMinor).toBeNull();
    expect(hidden.hourlyRateMinor).toBeNull();
    expect(hidden.shareToken).toBeNull();
    expect(hidden.repoUrl).toBeNull();
    expect(hidden.tags).toEqual([]);
    expect(shared.trackedMs).toBe(3 * HOUR);
    expect(shared.progress).toBe(70);
  });

  it("client detail: stats and milestones follow the share flags", async () => {
    const hidden = await svc.getProject(clientUser, ids.hidden!);
    expect(hidden.stats.trackedMs).toBeNull();
    expect(hidden.stats.billableMs).toBeNull();
    expect(hidden.milestones).toEqual([]);
    expect(hidden.project.progress).toBeNull();
    expect(hidden.project.members).toEqual([]);
    expect(hidden.project.client).toEqual({
      id: ids.acme,
      name: "Acme Inc",
      color: null,
      logoUrl: null,
    });
    const shared = await svc.getProject(clientUser, ids.shared!);
    expect(shared.stats.trackedMs).toBe(3 * HOUR);
  });

  it("member: only assigned projects, no budget / rate / share token / member cost", async () => {
    const list = await svc.listProjects(member);
    expect(list.map((p) => p.id)).toEqual([ids.hidden]);
    expect(list[0]!.budgetMinor).toBeNull();
    expect(list[0]!.hourlyRateMinor).toBeNull();
    expect(list[0]!.shareToken).toBeNull();
    expect(list[0]!.progress).toBe(40);
    expect(list[0]!.trackedMs).toBe(2 * HOUR);
    const detail = await svc.getProject(member, ids.hidden!);
    expect(detail.project.budgetMinor).toBeNull();
    expect(detail.project.shareToken).toBeNull();
    expect(detail.project.client).not.toHaveProperty("notes");
    expect(detail.project.client).not.toHaveProperty("taxId");
    expect(detail.project.members[0]!.hourlyCostMinor).toBeNull();
    expect(detail.stats.money).toEqual([]);
    expect(detail.milestones).toHaveLength(2);
  });

  it("owner: everything", async () => {
    const detail = await svc.getProject(owner, ids.hidden!);
    expect(detail.project.budgetMinor).toBe(500_000);
    expect(detail.project.shareToken).toBe("tok-hidden-0123456789");
    expect(detail.project.client).toHaveProperty("notes", "secret notes");
    expect(detail.project.members[0]!.hourlyCostMinor).toBe(9_999);
  });
});
