import "server-only";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import { leads } from "@/server/db/schema";
import { assertAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { notFound } from "@/server/errors";
import { createClient } from "@/server/modules/clients/service";
import { notifyAdmins } from "@/server/modules/notifications/service";
import type { contactInput, listLeadsInput, updateLeadStatusInput } from "./schemas";

/**
 * Leads = contact-form submissions. Public create (rate-limited in the
 * action), everything else admin-only.
 */

export function createLead(
  input: z.output<typeof contactInput>,
  meta: { locale: "fa" | "en"; ip: string | null; userAgent: string | null },
) {
  const row = db
    .insert(leads)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      company: input.company ?? null,
      service: input.service ?? null,
      budget: input.budget ?? null,
      message: input.message,
      source: input.source ?? "contact-form",
      locale: meta.locale,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 400) ?? null,
    })
    .returning({ id: leads.id })
    .get();
  logActivity(null, "lead.create", "lead", row.id, input.name);
  notifyAdmins({
    kind: "lead.new",
    title: meta.locale === "fa" ? `درخواست جدید از ${input.name}` : `New lead from ${input.name}`,
    body: input.message.slice(0, 200),
    href: "/panel/inbox",
  });
  return row;
}

export function listLeads(actor: Actor, input: z.output<typeof listLeadsInput> = {}) {
  assertAdmin(actor);
  return db
    .select()
    .from(leads)
    .where(
      and(
        input.status ? eq(leads.status, input.status) : undefined,
        input.q
          ? or(
              like(leads.name, `%${input.q}%`),
              like(leads.email, `%${input.q}%`),
              like(leads.company, `%${input.q}%`),
              like(leads.message, `%${input.q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(leads.createdAt))
    .limit(500)
    .all();
}

export function leadCounts(actor: Actor) {
  assertAdmin(actor);
  const rows = db
    .select({ status: leads.status, n: sql<number>`count(*)` })
    .from(leads)
    .groupBy(leads.status)
    .all();
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<
    Record<(typeof rows)[number]["status"], number>
  >;
}

export function getLead(actor: Actor, id: string) {
  assertAdmin(actor);
  const row = db.select().from(leads).where(eq(leads.id, id)).get();
  if (!row) throw notFound("Lead");
  return row;
}

export function updateLeadStatus(actor: Actor, input: z.output<typeof updateLeadStatusInput>) {
  assertAdmin(actor);
  const row = db
    .update(leads)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(leads.id, input.id))
    .returning()
    .get();
  if (!row) throw notFound("Lead");
  logActivity(actor, "lead.status", "lead", input.id, input.status);
  return row;
}

/** Create a client from a lead, mark the lead won and link it. */
export function convertLeadToClient(actor: Actor, id: string) {
  assertAdmin(actor);
  const lead = getLead(actor, id);
  if (lead.clientId) return { clientId: lead.clientId };
  const client = createClient(actor, {
    name: lead.company?.trim() || lead.name,
    kind: lead.company ? "company" : "person",
    email: lead.email,
    phone: lead.phone ?? null,
    notes: `${lead.name}${lead.company ? ` — ${lead.company}` : ""}\n\n${lead.message}`,
    defaultCurrency: lead.locale === "fa" ? "IRT" : "USD",
  });
  db.update(leads)
    .set({ status: "won", clientId: client.id, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .run();
  logActivity(actor, "lead.convert", "lead", id, client.name, { clientId: client.id });
  return { clientId: client.id };
}

export function deleteLead(actor: Actor, id: string) {
  assertAdmin(actor);
  db.delete(leads).where(eq(leads.id, id)).run();
  logActivity(actor, "lead.delete", "lead", id);
}
