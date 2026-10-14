import { transactionKinds } from "@/server/db/schema/finance";
import { normalizeDay } from "@/server/modules/finance/calc";
import type { ListTransactionsInput } from "@/server/modules/finance/schemas";

type SP = Record<string, string | string[] | undefined>;

const str = (sp: SP, k: string) => {
  const v = sp[k];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim().slice(0, 200) : undefined;
};

/** searchParams → validated transaction filters (invalid values are dropped). */
export function parseTxFilters(sp: SP) {
  const kind = str(sp, "kind");
  const from = str(sp, "from");
  const to = str(sp, "to");
  const filters = {
    q: str(sp, "q"),
    kind: kind && (transactionKinds as readonly string[]).includes(kind) ? (kind as ListTransactionsInput["kind"]) : undefined,
    accountId: str(sp, "accountId"),
    categoryId: str(sp, "categoryId"),
    projectId: str(sp, "projectId"),
    clientId: str(sp, "clientId"),
    from: from && normalizeDay(from) ? from : undefined,
    to: to && normalizeDay(to) ? to : undefined,
  };
  const page = Math.max(1, Math.min(10_000, Number.parseInt(str(sp, "page") ?? "1", 10) || 1));
  return { filters, page };
}

/** Filters → query string (without "?"), optionally with a page. */
export function filtersQuery(filters: Record<string, string | undefined>, page?: number) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v);
  if (page && page > 1) qs.set("page", String(page));
  return qs.toString();
}
