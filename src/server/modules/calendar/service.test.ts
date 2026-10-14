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
const { dayStartMs } = await import("@/components/calendar/grid");

const TZ = "Asia/Tehran";
const at = (iso: string) => new Date(iso);
const actor = (u: { id: string; role: Actor["user"]["role"]; clientId?: string | null }): Actor => ({
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
    const all = svc.listCalendarItems(owner, { ...range("2026-10-10", "2026-10-20"), sources: ["events"] });
    expect(new Set(all.map((i) => i.title))).toEqual(
      new Set(["Dentist", "Acme sync", "P1 internal", "P2 meeting", "Standup"]),
    );
    const mine = svc.listCalendarItems(member, { ...range("2026-10-10", "2026-10-20"), sources: ["events"] });
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
    expect(svc.listCommitmentsJson(owner, { status: "overdue" }).commitments.map((c) => c.title)).toContain(
      "Late",
    );
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
