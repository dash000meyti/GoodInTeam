import "server-only";
import { and, asc, eq, gte, isNotNull, isNull, ne, or } from "drizzle-orm";
import { db } from "@/server/db/client";
import { events, settings, tasks, users } from "@/server/db/schema";
import { assertStaff, type Actor } from "@/server/auth/actor";
import { hmac, safeEqual } from "@/server/auth/crypto";
import { logActivity } from "@/server/activity";
import { notFound } from "@/server/errors";
import { appTimezone } from "@/server/modules/settings/service";
import { env } from "@/lib/env";
import { newToken } from "@/lib/ids";
import { DAY_MS } from "@/lib/tz";
import { addDaysKey, dayKeyOf, diffDaysKey } from "@/components/calendar/grid";
import type { CalendarEvent } from "@/server/db/schema";
import { buildCalendar, rruleForIcs, type IcsEvent } from "./ics";
import { eventAccessWhere, getEvent } from "./service";

/**
 * Private ICS subscription feeds.
 *
 * Settings row `calendar.feeds` = { [userId]: { nonce, createdAt } }. The URL
 * token is HMAC(APP_SECRET, userId + nonce), so the database alone never
 * contains a usable feed URL. Regenerating = new nonce (old URL stops working).
 */
const FEEDS_KEY = "calendar.feeds";
const TOKEN_RE = /^[a-f0-9]{40}$/;

type FeedEntry = { nonce: string; createdAt: number };
type FeedMap = Record<string, FeedEntry>;

function readFeeds(): FeedMap {
  const row = db.select().from(settings).where(eq(settings.key, FEEDS_KEY)).get();
  const value = row?.value;
  if (!value || typeof value !== "object") return {};
  const out: FeedMap = {};
  for (const [userId, entry] of Object.entries(value as Record<string, unknown>)) {
    const e = entry as Partial<FeedEntry> | null;
    if (e && typeof e.nonce === "string")
      out[userId] = { nonce: e.nonce, createdAt: Number(e.createdAt) || 0 };
  }
  return out;
}

function writeFeeds(map: FeedMap) {
  db.insert(settings)
    .values({ key: FEEDS_KEY, value: map })
    .onConflictDoUpdate({ target: settings.key, set: { value: map, updatedAt: new Date() } })
    .run();
}

function feedToken(userId: string, nonce: string) {
  return hmac(`calendar-feed:v1:${userId}:${nonce}`).slice(0, 40);
}

export function feedUrl(token: string) {
  return `${env.siteUrl}/api/calendar/${token}/feed.ics`;
}

function feedInfo(userId: string, entry: FeedEntry) {
  const token = feedToken(userId, entry.nonce);
  return { url: feedUrl(token), createdAt: entry.createdAt };
}

/** The actor's feed URL (null when none was created yet). */
export function getFeed(actor: Actor) {
  assertStaff(actor);
  const entry = readFeeds()[actor.user.id];
  return entry ? feedInfo(actor.user.id, entry) : null;
}

/** Create the feed if missing and return it. */
export function ensureFeed(actor: Actor) {
  assertStaff(actor);
  return db.transaction(() => {
    const map = readFeeds();
    let entry = map[actor.user.id];
    if (!entry) {
      entry = { nonce: newToken(18), createdAt: Date.now() };
      writeFeeds({ ...map, [actor.user.id]: entry });
      logActivity(actor, "calendar.feed_create", "user", actor.user.id);
    }
    return feedInfo(actor.user.id, entry);
  });
}

/** Replace the feed token: the previous URL stops working immediately. */
export function regenerateFeed(actor: Actor) {
  assertStaff(actor);
  return db.transaction(() => {
    const entry = { nonce: newToken(18), createdAt: Date.now() };
    writeFeeds({ ...readFeeds(), [actor.user.id]: entry });
    logActivity(actor, "calendar.feed_regenerate", "user", actor.user.id);
    return feedInfo(actor.user.id, entry);
  });
}

/** Disable the actor's feed. */
export function revokeFeed(actor: Actor) {
  assertStaff(actor);
  db.transaction(() => {
    const map = readFeeds();
    delete map[actor.user.id];
    writeFeeds(map);
  });
  logActivity(actor, "calendar.feed_revoke", "user", actor.user.id);
}

/** Resolve a feed token to an active staff user (constant-time compare). */
function actorForToken(token: string): Actor | null {
  if (!TOKEN_RE.test(token)) return null;
  let userId: string | null = null;
  for (const [id, entry] of Object.entries(readFeeds())) {
    if (safeEqual(feedToken(id, entry.nonce), token)) userId = id;
  }
  if (!userId) return null;
  const u = db.select().from(users).where(eq(users.id, userId)).get();
  if (!u || u.disabled || u.role === "client") return null;
  return {
    via: "api",
    scopes: ["read"],
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      clientId: u.clientId,
      locale: u.locale,
      avatarUrl: u.avatarUrl,
      title: u.title,
    },
  };
}

// ─── ICS mapping ────────────────────────────────────────────────────────────

const statusMap = {
  tentative: "TENTATIVE",
  confirmed: "CONFIRMED",
  done: "CONFIRMED",
  missed: "CONFIRMED",
  canceled: "CANCELLED",
} as const;

function uidHost() {
  try {
    return new URL(env.siteUrl).hostname || "goodteam";
  } catch {
    return "goodteam";
  }
}

type EventRow = CalendarEvent & { project?: { name: string } | null; client?: { name: string } | null };

export function eventToIcs(row: EventRow, tz: string, opts: { panelUrl?: string } = {}): IcsEvent {
  const title = row.kind === "commitment" ? `🤝 ${row.title}` : row.title;
  const lines = [
    row.description?.trim(),
    [row.project?.name, row.client?.name].filter(Boolean).join(" · ") || null,
    row.meetingUrl ? `🔗 ${row.meetingUrl}` : null,
    opts.panelUrl ?? null,
  ].filter(Boolean);
  const base: IcsEvent = {
    uid: `${row.id}@${uidHost()}`,
    title,
    description: lines.join("\n\n") || null,
    location: row.location ?? (row.meetingUrl ? row.meetingUrl : null),
    url: row.meetingUrl,
    allDay: row.allDay,
    status: statusMap[row.status],
    categories: [row.kind.toUpperCase()],
    alarmMinutesBefore: row.remindMinutesBefore,
    stamp: row.updatedAt,
    created: row.createdAt,
    lastModified: row.updatedAt,
  };
  if (row.allDay) {
    const first = dayKeyOf(row.startAt, tz);
    const last = row.endAt ? dayKeyOf(row.endAt, tz) : first;
    return {
      ...base,
      startDate: first,
      endDateExclusive: addDaysKey(last < first ? first : last, 1),
      rrule: rruleForIcs(row.recurrence, { allDay: true }),
    };
  }
  // A UTC DTSTART may fall on the previous/next calendar date than the local start.
  const dayShift = diffDaysKey(dayKeyOf(row.startAt, tz), dayKeyOf(row.startAt, "UTC"));
  return {
    ...base,
    start: row.startAt,
    end: row.endAt,
    rrule: rruleForIcs(row.recurrence, { allDay: false, dayShift }),
  };
}

/** Full VCALENDAR for a feed token, or null when the token is unknown/revoked. */
export function buildFeed(token: string, opts: { includeTasks?: boolean; now?: number } = {}) {
  const actor = actorForToken(token);
  if (!actor) return null;
  const tz = appTimezone();
  const now = opts.now ?? Date.now();
  const since = new Date(now - 180 * DAY_MS);
  const rows = db.query.events
    .findMany({
      where: and(
        eventAccessWhere(actor),
        or(isNotNull(events.recurrence), gte(events.startAt, since)),
      ),
      with: {
        project: { columns: { name: true } },
        client: { columns: { name: true } },
      },
      orderBy: asc(events.startAt),
      limit: 5000,
    })
    .sync();
  const list: IcsEvent[] = rows.map((row) =>
    eventToIcs(row, tz, { panelUrl: `${env.siteUrl}/panel/calendar?view=day&date=${dayKeyOf(row.startAt, tz)}` }),
  );

  if (opts.includeTasks) {
    const isAdminUser = actor.user.role === "owner" || actor.user.role === "admin";
    const taskRows = db.query.tasks
      .findMany({
        where: and(
          isNotNull(tasks.dueAt),
          gte(tasks.dueAt, new Date(now - 30 * DAY_MS)),
          ne(tasks.status, "canceled"),
          ne(tasks.status, "done"),
          // "My" tasks: assigned to me, or unassigned ones I created (admins: all unassigned).
          or(
            eq(tasks.assigneeId, actor.user.id),
            and(
              isNull(tasks.assigneeId),
              isAdminUser ? undefined : eq(tasks.createdBy, actor.user.id),
            ),
          ),
        ),
        with: { project: { columns: { name: true } } },
        orderBy: asc(tasks.dueAt),
        limit: 2000,
      })
      .sync();
    for (const t of taskRows) {
      const key = dayKeyOf(t.dueAt!, tz);
      list.push({
        uid: `task-${t.id}@${uidHost()}`,
        title: `☑️ ${t.title}`,
        description:
          [t.project?.name, `${env.siteUrl}/panel/tasks?task=${t.id}`].filter(Boolean).join("\n") ||
          null,
        allDay: true,
        startDate: key,
        endDateExclusive: addDaysKey(key, 1),
        categories: ["TASK"],
        stamp: t.updatedAt,
        lastModified: t.updatedAt,
      });
    }
  }

  return buildCalendar(list, {
    name: `Good Team — ${actor.user.name}`,
    timezone: tz,
    refreshMinutes: 60,
  });
}

/** Single event as a downloadable .ics (session-authenticated). */
export function eventIcsFile(actor: Actor, id: string) {
  assertStaff(actor);
  const row = getEvent(actor, id);
  if (!row) throw notFound("Event");
  const tz = appTimezone();
  const body = buildCalendar([eventToIcs(row, tz)], { name: row.title, timezone: tz });
  const slug =
    row.title
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event";
  return { body, filename: `${slug}.ics` };
}
