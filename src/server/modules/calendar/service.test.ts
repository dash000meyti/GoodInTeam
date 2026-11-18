/**
 * Calendar service against a throwaway SQLite database (real migrations):
 * access rules, recurrence expansion, timing, commitments stats, ICS feed tokens.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/actor";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-calendar-"));
process.env.DATA_DIR = dir;
process.env.APP_TIMEZONE = "Asia/Tehran";

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const svc = await import("./service");
const feeds = await import("./feeds");
const tasksSvc = await import("@/server/modules/tasks/service");
const { taskAccessWhere } = await import("@/server/modules/tasks/access");
const { dayStartMs } = await import("@/components/calendar/grid");

const TZ = "Asia/Tehran";
const at = (iso: string) => new Date(iso);
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

beforeAll(() => {
  const [acme] = db.insert(s.clients).values({ name: "Acme" }).returning().all();
  const users = db
    .insert(s.users)
    .values([
      { email: "o@x.test", name: "Owner", role: "owner" },
      { email: "m@x.test", name: "Member", role: "member" },
      { email: "c@x.test", name: "Client", role: "client", clientId: acme!.id },
    ])
    .returning()
    .all();
  owner = actor({ id: users[0]!.id, role: "owner" });
  member = actor({ id: users[1]!.id, role: "member" });
  clientUser = actor({ id: users[2]!.id, role: "client", clientId: acme!.id });
  const [p1, p2] = db
    .insert(s.projects)
    .values([
      { name: "Shared", slug: "shared", clientId: acme!.id, portalEnabled: true },
      { name: "Private", slug: "private" },
    ])
    .returning()
    .all();
  ids.acme = acme!.id;
  ids.p1 = p1!.id;
  ids.p2 = p2!.id;
  db.insert(s.projectMembers).values({ projectId: p1!.id, userId: member.user.id }).run();

  const ev = (v: Partial<typeof s.events.$inferInsert> & { title: string; startAt: Date }) =>
    db
      .insert(s.events)
      .values({ createdBy: owner.user.id, ...v })
      .returning()
      .get().id;
  ids.personal = ev({ title: "Dentist", kind: "personal", startAt: at("2026-10-14T12:30:00Z") });
  ids.shared = ev({
    title: "Acme sync",
    projectId: p1!.id,
    visibleToClient: true,
    description: "internal notes",
    startAt: at("2026-10-15T06:30:00Z"),
    endAt: at("2026-10-15T07:30:00Z"),
  });
  ids.hidden = ev({ title: "P1 internal", projectId: p1!.id, startAt: at("2026-10-15T08:30:00Z") });
  ids.p2 = ev({ title: "P2 meeting", projectId: p2!.id, startAt: at("2026-10-16T06:30:00Z") });
  ids.weekly = ev({
    title: "Standup",
    startAt: at("2026-10-03T05:30:00Z"), // Saturday 09:00 Tehran
    endAt: at("2026-10-03T05:45:00Z"),
    recurrence: "FREQ=WEEKLY;BYDAY=SA,MO",
  });
});

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

const range = (from: string, to: string) => ({
  from: dayStartMs(from, TZ),
  to: dayStartMs(to, TZ),
});

describe("access", () => {
  it("owner sees everything, members only own + assigned project events", () => {
    const all = svc.listCalendarItems(owner, {
      ...range("2026-10-10", "2026-10-20"),
      sources: ["events"],
    });
    expect(new Set(all.map((i) => i.title))).toEqual(
      new Set(["Dentist", "Acme sync", "P1 internal", "P2 meeting", "Standup"]),
    );
    const mine = svc.listCalendarItems(member, {
      ...range("2026-10-10", "2026-10-20"),
      sources: ["events"],
    });
    expect(new Set(mine.map((i) => i.title))).toEqual(new Set(["Acme sync", "P1 internal"]));
    expect(mine.every((i) => i.event?.canEdit === false)).toBe(true);
  });

  it("members can't edit others' events or link clients, but can edit their own", () => {
    expect(() => svc.updateEvent(member, { id: ids.shared!, title: "x" })).toThrow(/creator/);
    expect(() =>
      svc.createEvent(member, {
        title: "x",
        kind: "meeting",
        allDay: false,
        visibleToClient: false,
        date: "2026-10-15",
        clientId: ids.acme,
      }),
    ).toThrow();
    const own = svc.createEvent(member, {
      title: "Member focus",
      kind: "focus",
      allDay: false,
      visibleToClient: false,
      date: "2026-10-15",
      startTime: "10:00",
      endTime: "11:00",
      projectId: ids.p1,
    });
    // The project's client is used as "to whom".
    expect(own.clientId).toBe(ids.acme);
    expect(svc.updateEvent(member, { id: own.id, title: "Renamed" }).title).toBe("Renamed");
    expect(() =>
      svc.createEvent(member, {
        title: "x",
        kind: "meeting",
        allDay: false,
        visibleToClient: false,
        date: "2026-10-15",
        projectId: ids.p2,
      }),
    ).toThrow();
  });

  it("clients only get visibleToClient events of their portal projects, without private fields", () => {
    const { upcoming, past } = svc.listProjectEvents(clientUser, ids.p1!, {
      now: Date.parse("2026-10-01T00:00:00Z"),
    });
    expect([...upcoming, ...past].map((i) => i.title)).toEqual(["Acme sync"]);
    expect(upcoming[0]!.event!.description).toBeNull();
    expect(() => svc.listProjectEvents(clientUser, ids.p2!)).toThrow();
    expect(() => svc.listCalendarItems(clientUser, range("2026-10-10", "2026-10-20"))).toThrow();
  });
});

describe("recurrence & timing", () => {
  it("expands recurring events into the visible range", () => {
    const items = svc
      .listCalendarItems(owner, { ...range("2026-10-10", "2026-10-24"), sources: ["events"] })
      .filter((i) => i.title === "Standup");
    // Sat 10, Mon 12, Sat 17, Mon 19
    expect(items).toHaveLength(4);
    expect(new Set(items.map((i) => i.key)).size).toBe(4);
    expect(items[0]!.end - items[0]!.start).toBe(15 * 60_000);
  });

  it("lists one entry per recurring series on the project panel", () => {
    svc.createEvent(owner, {
      title: "Weekly P1 sync",
      kind: "meeting",
      allDay: false,
      visibleToClient: true,
      date: "2026-10-17",
      startTime: "10:00",
      endTime: "11:00",
      recurrence: "FREQ=WEEKLY",
      projectId: ids.p1,
    });
    const { upcoming, past } = svc.listProjectEvents(owner, ids.p1!, {
      now: Date.parse("2026-11-20T00:00:00Z"),
    });
    expect(upcoming.filter((i) => i.title === "Weekly P1 sync")).toHaveLength(1);
    expect(past.filter((i) => i.title === "Weekly P1 sync")).toHaveLength(1);
    // The latest past occurrence comes first.
    expect(new Date(past.find((i) => i.title === "Weekly P1 sync")!.start).toISOString()).toBe(
      "2026-11-14T06:30:00.000Z",
    );
  });

  it("stores all-day multi-day events with an inclusive last day", () => {
    const row = svc.createEvent(owner, {
      title: "Retreat",
      kind: "personal",
      allDay: true,
      visibleToClient: false,
      date: "2026-10-19",
      endDate: "2026-10-21",
    });
    expect(row.startAt.getTime()).toBe(dayStartMs("2026-10-19", TZ));
    expect(row.endAt!.getTime()).toBe(dayStartMs("2026-10-21", TZ));
    const item = svc
      .listCalendarItems(owner, { ...range("2026-10-18", "2026-10-25"), sources: ["events"] })
      .find((i) => i.id === row.id)!;
    expect(item.end).toBe(dayStartMs("2026-10-22", TZ));
  });

  it("rolls an end time before the start over to the next day and keeps duration on moves", () => {
    const row = svc.createEvent(owner, {
      title: "Late deploy",
      kind: "focus",
      allDay: false,
      visibleToClient: false,
      date: "2026-10-15",
      startTime: "22:00",
      endTime: "01:30",
    });
    expect(row.endAt!.getTime() - row.startAt.getTime()).toBe(3.5 * 3_600_000);
    const moved = svc.updateEvent(owner, { id: row.id, startTime: "20:00" });
    expect(moved.endAt!.getTime() - moved.startAt.getTime()).toBe(3.5 * 3_600_000);
    const viaIso = svc.updateEvent(owner, { id: row.id, startAt: "2026-10-16T09:00" });
    expect(viaIso.startAt.toISOString()).toBe("2026-10-16T05:30:00.000Z");
    expect(viaIso.endAt!.getTime() - viaIso.startAt.getTime()).toBe(3.5 * 3_600_000);
  });
});

describe("commitments", () => {
  it("groups, rates and reschedules commitments", () => {
    const now = Date.parse("2026-10-14T08:00:00Z");
    const mk = (title: string, due: string, promisedAt?: string) =>
      svc.createCommitment(owner, {
        title,
        due,
        clientId: ids.acme,
        promisedAt,
        visibleToClient: false,
      });
    const late = mk("Late", "2026-10-12", "2026-10-02");
    const kept = mk("Kept", "2026-10-10", "2026-10-01");
    const missed = mk("Missed", "2026-10-11T15:00", "2026-10-05");
    const soon = mk("Soon", "2026-10-14"); // due today (all-day) → not overdue yet
    svc.setCommitmentStatus(owner, { id: kept.id, status: "kept" });
    svc.setCommitmentStatus(owner, { id: missed.id, status: "missed" });

    const res = svc.listCommitments(owner, {}, now);
    const group = (id: string) => res.items.find((i) => i.id === id)!.group;
    expect(group(late.id)).toBe("overdue");
    expect(group(kept.id)).toBe("kept");
    expect(group(missed.id)).toBe("missed");
    expect(group(soon.id)).toBe("upcoming");
    expect(res.stats.keepRate).toBe(0.5);
    expect(res.stats.byClient.find((c) => c.client?.id === ids.acme)!.keepRate).toBe(0.5);
    expect(res.stats.avgLeadMs).toBeGreaterThan(0);

    // Reschedule a missed timed commitment → pending again, same time of day.
    const moved = svc.rescheduleCommitment(owner, { id: missed.id, due: "2026-10-20" });
    expect(moved.status).toBe("confirmed");
    expect(moved.startAt.toISOString()).toBe("2026-10-20T11:30:00.000Z");

    expect(() => svc.setCommitmentStatus(owner, { id: ids.shared!, status: "kept" })).toThrow();
    expect(
      svc.listCommitmentsJson(owner, { status: "overdue" }).commitments.map((c) => c.title),
    ).toContain("Late");
  });
});

describe("ICS feed", () => {
  it("creates, serves and rotates a private feed", () => {
    expect(feeds.getFeed(owner)).toBeNull();
    const first = feeds.ensureFeed(owner);
    expect(feeds.ensureFeed(owner).url).toBe(first.url);
    const token = first.url.split("/").at(-2)!;
    const ics = feeds.buildFeed(token)!;
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:🤝 Late");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=SA,MO");
    expect(feeds.buildFeed("0".repeat(40))).toBeNull();

    const next = feeds.regenerateFeed(owner);
    expect(next.url).not.toBe(first.url);
    expect(feeds.buildFeed(token)).toBeNull();
    expect(feeds.buildFeed(next.url.split("/").at(-2)!)).not.toBeNull();

    // A member's feed only contains what the member can see.
    const memberToken = feeds.ensureFeed(member).url.split("/").at(-2)!;
    const memberIcs = feeds.buildFeed(memberToken)!;
    expect(memberIcs).toContain("Acme sync");
    expect(memberIcs).not.toContain("Dentist");
  });
});

/**
 * The calendar has no task access rule of its own: its task overlay and the ICS
 * feed use `taskAccessWhere` from the tasks module. A private copy once let
 * admins see other users' personal tasks ("private, even for admins").
 */
describe("task overlay: same access as the tasks module", () => {
  let admin: Actor;
  let other: Actor;
  const task: Record<string, string> = {};
  const DUE = at("2027-03-10T08:00:00Z");
  const WINDOW = range("2027-03-01", "2027-03-20");
  const NOW = Date.parse("2027-03-05T08:00:00Z");

  beforeAll(() => {
    const users = db
      .insert(s.users)
      .values([
        { email: "a@x.test", name: "Admin", role: "admin" },
        { email: "n@x.test", name: "Other member", role: "member" },
      ])
      .returning()
      .all();
    admin = actor({ id: users[0]!.id, role: "admin" });
    other = actor({ id: users[1]!.id, role: "member" });
    const projectId = (name: string) =>
      db
        .select()
        .from(s.projects)
        .all()
        .find((p) => p.name === name)!.id;
    const shared = projectId("Shared"); // `member` is assigned to it
    const closed = projectId("Private"); // nobody is assigned
    const add = (key: string, v: { createdBy: Actor; assignee?: Actor; projectId?: string }) => {
      task[key] = db
        .insert(s.tasks)
        .values({
          title: `task:${key}`,
          status: "todo",
          dueAt: DUE,
          dueAllDay: false,
          createdBy: v.createdBy.user.id,
          assigneeId: v.assignee?.user.id ?? null,
          projectId: v.projectId ?? null,
        })
        .returning()
        .get().id;
    };
    // Personal tasks (no project): private to their creator / assignee.
    add("otherPrivate", { createdBy: other, assignee: other });
    add("otherUnassigned", { createdBy: other });
    add("ownerPersonal", { createdBy: owner });
    add("adminPersonal", { createdBy: admin });
    add("memberPersonal", { createdBy: member });
    add("otherForMember", { createdBy: other, assignee: member });
    add("otherForOwner", { createdBy: other, assignee: owner });
    // Project tasks: admins see all, members those of their projects.
    add("sharedTask", { createdBy: owner, projectId: shared });
    add("closedTask", { createdBy: owner, projectId: closed });
    add("closedForMember", { createdBy: owner, assignee: member, projectId: closed });
    add("closedByMember", { createdBy: member, projectId: closed });
  });

  const names = (ids: Iterable<string>) => {
    const byId = new Map(Object.entries(task).map(([k, id]) => [id, k]));
    return [...ids].map((id) => byId.get(id) ?? id).sort();
  };
  const viaCalendar = (a: Actor) =>
    names(svc.listCalendarItems(a, { ...WINDOW, sources: ["tasks"] }).map((i) => i.id));
  const viaTasks = async (a: Actor) =>
    names((await tasksSvc.listTasks(a, {}, NOW)).map((t) => t.id));
  const viaFeed = (a: Actor) => {
    const token = feeds.ensureFeed(a).url.split("/").at(-2)!;
    const ics = feeds.buildFeed(token, { includeTasks: true, now: NOW })!;
    return names([...ics.matchAll(/^UID:task-([^@]+)@/gm)].map((m) => m[1]!));
  };

  it.each([
    [
      "owner",
      () => owner,
      [
        "closedByMember",
        "closedForMember",
        "closedTask",
        "otherForOwner",
        "ownerPersonal",
        "sharedTask",
      ],
    ],
    [
      "admin",
      () => admin,
      ["adminPersonal", "closedByMember", "closedForMember", "closedTask", "sharedTask"],
    ],
    ["member", () => member, ["memberPersonal", "otherForMember", "sharedTask"]],
    [
      "another member",
      () => other,
      ["otherForMember", "otherForOwner", "otherPrivate", "otherUnassigned"],
    ],
  ] as const)(
    "%s: the calendar shows exactly the tasks the tasks module shows",
    async (_, who, expected) => {
      const a = who();
      expect(viaCalendar(a)).toEqual(await viaTasks(a));
      expect(viaCalendar(a)).toEqual([...expected]);
    },
  );

  it("another user's personal task is hidden from the owner and the admin", () => {
    for (const a of [owner, admin]) {
      const seen = viaCalendar(a);
      expect(seen).not.toContain("otherPrivate");
      expect(seen).not.toContain("otherUnassigned");
      expect(seen).not.toContain("memberPersonal");
    }
    // The agenda (the `calendar_agenda` tool) reads the same list.
    const { text } = svc.agenda(owner, { days: 31, from: "2027-03-01", includeTasks: true });
    expect(text).toContain("task:ownerPersonal");
    expect(text).not.toContain("task:otherPrivate");
    expect(text).not.toContain("task:otherUnassigned");
  });

  it("client: no task from either module", async () => {
    expect(() => viaCalendar(clientUser)).toThrowError(
      expect.objectContaining({ code: "forbidden" }),
    );
    await expect(viaTasks(clientUser)).rejects.toMatchObject({ code: "forbidden" });
    expect(
      db.select({ id: s.tasks.id }).from(s.tasks).where(taskAccessWhere(clientUser)).all(),
    ).toEqual([]);
  });

  it("the ICS feed (?tasks=1) never carries a task its user can't open", async () => {
    for (const a of [owner, admin, member, other]) {
      const allowed = new Set(await viaTasks(a));
      for (const key of viaFeed(a)) expect(allowed, `${a.user.role} feed: ${key}`).toContain(key);
    }
    // "My" tasks of the feed: assigned to me, or unassigned ones I may see.
    expect(viaFeed(owner)).toEqual([
      "closedByMember",
      "closedTask",
      "otherForOwner",
      "ownerPersonal",
      "sharedTask",
    ]);
    expect(viaFeed(admin)).toEqual(["adminPersonal", "closedByMember", "closedTask", "sharedTask"]);
    expect(viaFeed(member)).toEqual(["memberPersonal", "otherForMember"]);
    expect(viaFeed(other)).toEqual(["otherPrivate", "otherUnassigned"]);
  });
});
