/**
 * Finance services against a throwaway SQLite database (real migrations):
 * a partial update changes only what was sent — it never falls back to a
 * create default (status "cleared", currency "IRT", kind "bank", no lines).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/actor";

vi.mock("server-only", () => ({}));

const dir = mkdtempSync(path.join(tmpdir(), "gt-finance-"));
process.env.DATA_DIR = dir;
process.env.APP_TIMEZONE = "Asia/Tehran";

const { db, getDb } = await import("@/server/db/client");
const s = await import("@/server/db/schema");
const { eq } = await import("drizzle-orm");
const { callTool } = await import("@/server/api/registry");
const svc = await import("./service");
const inv = await import("./invoices");
const {
  invoiceInput,
  transactionInput,
  updateAccountInput,
  updateCategoryInput,
  updateInvoiceInput,
  updateTransactionInput,
} = await import("./schemas");

let owner: Actor;
const ids: Record<string, string> = {};
const HOUR = 3_600_000;

const tx = (id: string) => db.select().from(s.transactions).where(eq(s.transactions.id, id)).get()!;
const invoice = (id: string) => db.select().from(s.invoices).where(eq(s.invoices.id, id)).get()!;
const lines = (id: string) =>
  db
    .select()
    .from(s.invoiceItems)
    .where(eq(s.invoiceItems.invoiceId, id))
    .orderBy(s.invoiceItems.sort)
    .all();
const entry = (id: string) =>
  db.select().from(s.timeEntries).where(eq(s.timeEntries.id, id)).get()!;

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
  ids.usd = db
    .insert(s.accounts)
    .values({ name: "Wise", kind: "wallet", currency: "USD", notes: "fees apply" })
    .returning()
    .get().id;
  ids.irt = db
    .insert(s.accounts)
    .values({ name: "Bank", kind: "bank", currency: "IRT" })
    .returning()
    .get().id;
  ids.category = db
    .insert(s.categories)
    .values({ name: "Hosting", kind: "expense", color: "#FF5630" })
    .returning()
    .get().id;
  ids.project = db
    .insert(s.projects)
    .values({ name: "Site", slug: "site", currency: "USD" })
    .returning()
    .get().id;
  const start = Date.parse("2026-10-01T06:00:00Z");
  ids.time = db
    .insert(s.timeEntries)
    .values({
      userId: u.id,
      projectId: ids.project,
      startedAt: new Date(start),
      endedAt: new Date(start + 2 * HOUR),
    })
    .returning()
    .get().id;
});

afterAll(() => {
  getDb().sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("transactions", () => {
  const pending = () =>
    svc.createTransaction(
      owner,
      transactionInput.parse({
        kind: "expense",
        accountId: ids.usd,
        amount: "12.50",
        date: "2026-10-05",
        time: "09:30",
        categoryId: ids.category,
        counterparty: "Hetzner",
        status: "pending",
        tags: "infra, monthly",
      }),
    );

  it("the finance_update_transaction tool with only a description keeps status = pending", async () => {
    const before = pending();
    expect(before.status).toBe("pending");
    await callTool({ ...owner, via: "api" }, "finance_update_transaction", {
      id: before.id,
      description: "hosting",
    });
    const after = tx(before.id);
    expect(after.description).toBe("hosting");
    expect(after.status).toBe("pending");
    // Nothing else moved either.
    const rest = (r: typeof before) => ({ ...r, description: null, updatedAt: null });
    expect(rest(after)).toEqual(rest(before));
  });

  it("a status change is still applied when it is sent", () => {
    const row = pending();
    svc.updateTransaction(owner, updateTransactionInput.parse({ id: row.id, status: "cleared" }));
    expect(tx(row.id).status).toBe("cleared");
    svc.updateTransaction(owner, updateTransactionInput.parse({ id: row.id, status: "pending" }));
    expect(tx(row.id)).toMatchObject({ status: "pending", amountMinor: 1250, currency: "USD" });
  });

  it("create still defaults to cleared", () => {
    const row = svc.createTransaction(
      owner,
      transactionInput.parse({ kind: "income", accountId: ids.irt, amount: "1000" }),
    );
    expect(row.status).toBe("cleared");
  });
});

describe("invoices", () => {
  const draft = () =>
    inv.createInvoice(
      owner,
      invoiceInput.parse({
        projectId: ids.project,
        currency: "USD",
        items: [
          { description: "Design", quantity: 2, unitPrice: "150", timeEntryIds: [ids.time] },
          { description: "Hosting", unitPrice: "20.50" },
        ],
        discount: "10",
        taxPercent: 9,
        notes: "Thanks",
      }),
    );

  it("updating an invoice without `items` keeps its lines, totals, currency and billed time", () => {
    const created = draft();
    const before = { invoice: invoice(created.id), lines: lines(created.id) };
    expect(before.lines.map((l) => l.description)).toEqual(["Design", "Hosting"]);
    expect(before.invoice).toMatchObject({ currency: "USD", subtotalMinor: 32_050 });
    expect(entry(ids.time!).invoiceId).toBe(created.id);

    inv.updateInvoice(owner, updateInvoiceInput.parse({ id: created.id, notes: "Net 14" }));

    const after = { invoice: invoice(created.id), lines: lines(created.id) };
    expect(after.invoice.notes).toBe("Net 14");
    expect(after.lines).toEqual(before.lines);
    const rest = (r: typeof before.invoice) => ({ ...r, notes: null, updatedAt: null });
    expect(rest(after.invoice)).toEqual(rest(before.invoice));
    expect(entry(ids.time!).invoiceId).toBe(created.id);
    inv.deleteInvoice(owner, created.id); // releases the time entry for the next test
  });

  it("sending `items` still replaces every line (an empty list removes them)", () => {
    const created = draft();
    inv.updateInvoice(
      owner,
      updateInvoiceInput.parse({
        id: created.id,
        items: [{ description: "Only line", unitPrice: "5" }],
      }),
    );
    expect(lines(created.id).map((l) => l.description)).toEqual(["Only line"]);
    expect(invoice(created.id)).toMatchObject({ currency: "USD", subtotalMinor: 500 });
    expect(entry(ids.time!).invoiceId).toBeNull();
    inv.updateInvoice(owner, updateInvoiceInput.parse({ id: created.id, items: [] }));
    expect(lines(created.id)).toEqual([]);
    inv.deleteInvoice(owner, created.id);
  });

  it("create still defaults to IRT and no lines", () => {
    const row = inv.createInvoice(owner, invoiceInput.parse({}));
    expect(row.currency).toBe("IRT");
    expect(lines(row.id)).toEqual([]);
  });
});

describe("accounts and categories", () => {
  const account = (id: string) => db.select().from(s.accounts).where(eq(s.accounts.id, id)).get()!;

  it("renaming an account keeps its kind and currency", () => {
    svc.updateAccount(owner, updateAccountInput.parse({ id: ids.usd, name: "Wise USD" }));
    expect(account(ids.usd!)).toMatchObject({
      name: "Wise USD",
      kind: "wallet",
      currency: "USD",
      notes: "fees apply",
    });
  });

  it("an {id}-only account update is a harmless no-op", () => {
    const before = account(ids.usd!);
    svc.updateAccount(owner, updateAccountInput.parse({ id: ids.usd }));
    expect({ ...account(ids.usd!), updatedAt: null }).toEqual({ ...before, updatedAt: null });
  });

  it("renaming a category keeps its kind and colour", () => {
    svc.updateCategory(owner, updateCategoryInput.parse({ id: ids.category, name: "Servers" }));
    const c = db.select().from(s.categories).where(eq(s.categories.id, ids.category!)).get()!;
    expect(c).toMatchObject({ name: "Servers", kind: "expense", color: "#FF5630" });
  });
});
