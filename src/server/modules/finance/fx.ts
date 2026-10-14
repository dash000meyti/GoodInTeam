import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import { fxRates } from "@/server/db/schema";
import { assertAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { notFound } from "@/server/errors";
import { convertMinor, parseRateInput, pickRate, type RatePoint, type RateTable } from "./calc";
import { FinanceError } from "./errors";
import { baseCurrency, parseDay, todayStart } from "./internal";
import type { fxRateInput, updateFxRateInput } from "./schemas";

/**
 * FX rates: `rate` = units of the base currency (business.baseCurrency) that ONE
 * unit of `currency` is worth on `date` (major per major). Only rows whose `base`
 * equals the current base currency are used for conversions.
 */

export function listFxRates(actor: Actor) {
  assertAdmin(actor);
  const base = baseCurrency();
  const rows = db
    .select()
    .from(fxRates)
    .where(eq(fxRates.base, base))
    .orderBy(desc(fxRates.date), asc(fxRates.currency))
    .all();
  return { base, rows };
}

/** Rate history per currency (ascending by date) for the current base. */
export function rateHistory(): Map<string, RatePoint[]> {
  const base = baseCurrency();
  const map = new Map<string, RatePoint[]>();
  for (const r of db
    .select({ currency: fxRates.currency, rate: fxRates.rate, date: fxRates.date })
    .from(fxRates)
    .where(eq(fxRates.base, base))
    .orderBy(asc(fxRates.date))
    .all()) {
    const list = map.get(r.currency) ?? [];
    list.push({ rate: r.rate, date: r.date.getTime() });
    map.set(r.currency, list);
  }
  return map;
}

/** Latest rate per currency → { base, rates: RateTable, dates: currency → epoch ms }. */
export function latestRates() {
  const base = baseCurrency();
  const rates: RateTable = {};
  const dates: Record<string, number> = {};
  for (const [currency, points] of rateHistory()) {
    const last = points[points.length - 1];
    if (last) {
      rates[currency] = last.rate;
      dates[currency] = last.date;
    }
  }
  return { base, rates, dates };
}

/**
 * Convert minor units between currencies using the rate in effect at `at`
 * (latest on/before; else the earliest after). Returns null when no rate exists
 * for a needed currency — callers must show "no rate" rather than guess.
 */
export function convert(minor: number, from: string, to: string, at: Date | number = Date.now()) {
  if (from === to) return { minor, approximate: false };
  const base = baseCurrency();
  const history = rateHistory();
  const t = new Date(at).getTime();
  const table: RateTable = {};
  for (const c of [from, to]) {
    if (c === base) continue;
    const p = pickRate(history.get(c) ?? [], t);
    if (!p) return null;
    table[c] = p.rate;
  }
  const v = convertMinor(minor, from, to, table, base);
  return v == null ? null : { minor: v, approximate: true };
}

function rateValue(input: string | number) {
  const rate = parseRateInput(input);
  if (rate == null) throw new FinanceError("invalidRate", "rate");
  return rate;
}

/** Insert or replace the rate of `currency` for a day (one per currency/base/day). */
export function setFxRate(actor: Actor, input: z.output<typeof fxRateInput>) {
  assertAdmin(actor);
  const base = baseCurrency();
  if (input.currency === base) throw new FinanceError("rateForBase", "currency");
  const rate = rateValue(input.rate);
  const date = input.date ? parseDay(input.date) : new Date(todayStart());
  const row = db
    .insert(fxRates)
    .values({ currency: input.currency, base, rate, date, source: "manual" })
    .onConflictDoUpdate({
      target: [fxRates.currency, fxRates.base, fxRates.date],
      set: { rate, source: "manual" },
    })
    .returning()
    .get();
  logActivity(actor, "fx.set", "fx_rate", row.id, `${input.currency}=${rate} ${base}`);
  return row;
}

export function updateFxRate(actor: Actor, input: z.output<typeof updateFxRateInput>) {
  assertAdmin(actor);
  const row = db.select().from(fxRates).where(eq(fxRates.id, input.id)).get();
  if (!row) throw notFound("FX rate");
  const currency = input.currency ?? row.currency;
  if (currency === row.base) throw new FinanceError("rateForBase", "currency");
  const patch = {
    currency,
    rate: input.rate !== undefined ? rateValue(input.rate) : row.rate,
    date: input.date ? parseDay(input.date) : row.date,
  };
  // Replacing onto an existing (currency, base, date) row: drop the other one.
  const clash = db
    .select({ id: fxRates.id })
    .from(fxRates)
    .where(
      and(eq(fxRates.currency, patch.currency), eq(fxRates.base, row.base), eq(fxRates.date, patch.date)),
    )
    .get();
  return db.transaction((tx) => {
    if (clash && clash.id !== row.id) tx.delete(fxRates).where(eq(fxRates.id, clash.id)).run();
    const updated = tx.update(fxRates).set(patch).where(eq(fxRates.id, row.id)).returning().get();
    logActivity(actor, "fx.update", "fx_rate", row.id, `${patch.currency}=${patch.rate}`);
    return updated;
  });
}

export function deleteFxRate(actor: Actor, id: string) {
  assertAdmin(actor);
  db.delete(fxRates).where(eq(fxRates.id, id)).run();
  logActivity(actor, "fx.delete", "fx_rate", id);
}
