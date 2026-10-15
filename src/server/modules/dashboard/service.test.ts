/**
 * Staff dashboard against a throwaway SQLite database (real migrations):
 * member scoping, overdue semantics and recurring upcoming events.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/actor";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-dashboard-"));
process.env.DATA_DIR = dir;
process.env.APP_TIMEZONE = "Asia/Tehran";

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { staffDashboard } = await import("./service");
const { smartListCounts } = await import("@/server/modules/tasks/service");
const { fromDateInput } = await import("@/lib/tz");

const TZ = "Asia/Tehran";
// Thursday 2026-10-15, 10:30 in Tehran.
const NOW = fromDateInput("2026-10-15", "10:30", TZ).getTime();
const day = (d: string) => fromDateInput(d, undefined, TZ);
const at = (d: string, t: string) => fromDateInput(d, t, TZ);

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

beforeAll(() => {
  const users = db
    .insert(s.users)
    .values([
      { email: "o@x.test", name: "Owner", role: "owner" },
      { email: "m@x.test", name: "Member", role: "member" },
      { email: "m2@x.test", name: "Other member", role: "member" },
    ])
    .returning()
    .all();
  owner = actor({ id: users[0]!.id, role: "owner" });
  member = actor({ id: users[1]!.id, role: "member" });
  const other = users[2]!.id;

  const [mine, theirs] = db
    .insert(s.projects)
    .values([
      {
        name: "Assigned",
        slug: "assigned",
        budgetMinor: 1_000_000,
        shareToken: "tok-0123456789abcdef",
      },
      { name: "Not assigned", slug: "not-assigned" },
    ])
    .returning()
    .all();
  db.insert(s.projectMembers).values({ projectId: mine!.id, userId: member.user.id }).run();

  const task = (v: Partial<typeof s.tasks.$inferInsert> & { title: string }) =>
    db
      .insert(s.tasks)
      .values({ status: "todo", createdBy: owner.user.id, ...v })
      .run();
  task({ title: "all-day today", projectId: mine!.id, dueAt: day("2026-10-15"), dueAllDay: true });
  task({
    title: "timed earlier today",
    projectId: mine!.id,
    dueAt: at("2026-10-15", "09:00"),
    dueAllDay: false,
  });
  task({
    title: "timed later today",
    projectId: mine!.id,
    dueAt: at("2026-10-15", "18:00"),
    dueAllDay: false,
  });
  task({ title: "yesterday", projectId: mine!.id, dueAt: day("2026-10-14"), dueAllDay: true });
  task({ title: "other project late", projectId: theirs!.id, dueAt: day("2026-10-10") });
  task({ title: "someone's personal", createdBy: other, dueAt: day("2026-10-15") });
  task({
    title: "my personal",
    createdBy: member.user.id,
    dueAt: day("2026-10-16"),
    dueAllDay: true,
  });

  const event = (v: Partial<typeof s.events.$inferInsert> & { title: string; startAt: Date }) =>
    db
      .insert(s.events)
      .values({ createdBy: owner.user.id, ...v })
      .run();
  // Weekly standup that started weeks ago: its next occurrence must show up.
  event({
    title: "Standup",
    projectId: mine!.id,
    startAt: at("2026-09-26", "09:00"),
    endAt: at("2026-09-26", "09:15"),
    recurrence: "FREQ=WEEKLY;BYDAY=SA",
  });
  event({ title: "Kickoff", projectId: theirs!.id, startAt: at("2026-10-16", "11:00") });
  event({
    title: "Canceled",
    projectId: mine!.id,
    status: "canceled",
    startAt: at("2026-10-16", "12:00"),
  });
});

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

const dashboard = (a: Actor) => staffDashboard(a, { tz: TZ, locale: "fa", now: NOW });

describe("member scoping", () => {
  it("members only count tasks of assigned projects + their own personal tasks", async () => {
    const d = await dashboard(member);
    expect(d.openTasks).toBe(5);
    expect(d.dueToday.map((t) => t.title).sort()).toEqual(
      ["all-day today", "timed earlier today", "timed later today", "yesterday"].sort(),
    );
  });

  it("members only see assigned projects (without money fields)", async () => {
    const d = await dashboard(member);
    expect(d.activeProjects.map((p) => p.name)).toEqual(["Assigned"]);
    expect(d.activeProjectCount).toBe(1);
    expect(d.activeProjects[0]).not.toHaveProperty("budgetMinor");
    expect(d.activeProjects[0]).not.toHaveProperty("shareToken");
    expect(d.money).toEqual([]);
  });

  it("owner sees all project tasks and projects, but not others' personal tasks", async () => {
    const d = await dashboard(owner);
    expect(d.openTasks).toBe(5);
    expect(d.dueToday.map((t) => t.title)).toContain("other project late");
    expect(d.dueToday.map((t) => t.title)).not.toContain("someone's personal");
    expect(d.activeProjectCount).toBe(2);
  });
});

describe("overdue", () => {
  it("all-day tasks due today are not overdue; passed timed tasks are", async () => {
    const d = await dashboard(member);
    const flag = Object.fromEntries(d.dueToday.map((t) => [t.title, t.overdue]));
    expect(flag).toEqual({
      "all-day today": false,
      "timed earlier today": true,
      "timed later today": false,
      yesterday: true,
    });
    expect(d.overdue).toBe(2);
    expect((await dashboard(owner)).overdue).toBe(3);
  });

  it("smart-list overdue count uses the same rule", () => {
    expect(smartListCounts(member, NOW).overdue).toBe(2);
  });
});

describe("upcoming events", () => {
  it("includes the next occurrence of recurring events, respects access, skips canceled", async () => {
    const mine = await dashboard(member);
    expect(mine.upcoming.map((e) => e.title)).toEqual(["Standup"]);
    expect(mine.upcoming[0]!.start).toBe(at("2026-10-17", "09:00").getTime());
    const all = await dashboard(owner);
    expect(all.upcoming.map((e) => e.title)).toEqual(["Kickoff", "Standup"]);
  });
});
