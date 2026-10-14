/**
 * Pure helpers for the docs module (no DB, no server-only) — unit-tested in
 * tree.test.ts.
 */

/** Nest rows by parentId. Rows whose parent is not in the set become roots. */
export function buildDocTree<T extends { id: string; parentId: string | null }>(rows: T[]) {
  type Node = T & { children: Node[] };
  const nodes = new Map<string, Node>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: Node[] = [];
  for (const node of nodes.values()) {
    const parent =
      node.parentId && node.parentId !== node.id ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Depth-first flattening of a tree with depth info (for parent pickers). */
export function flattenDocTree<T extends { id: string; children: T[] }>(
  nodes: T[],
  opts: { exclude?: string } = {},
  depth = 0,
): (Omit<T, "children"> & { depth: number })[] {
  const out: (Omit<T, "children"> & { depth: number })[] = [];
  for (const { children, ...n } of nodes) {
    if (n.id === opts.exclude) continue; // skip a page and its whole subtree
    out.push({ ...n, depth });
    out.push(...flattenDocTree(children, opts, depth + 1));
  }
  return out;
}

/** Arabic → Persian letters + lowercase, so "كتاب"/"کتاب" and "API"/"api" match. */
export function normalizeSearch(s: string) {
  return s
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

/** Escape LIKE wildcards (use with `escape '\\'`). */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Plain-text snippet around the first match plus [start, end) ranges of every
 * match inside it (for <mark> highlighting).
 */
export function makeSnippet(text: string, query: string, radius = 90) {
  const q = normalizeSearch(query.trim());
  const norm = normalizeSearch(text);
  const exact = norm.length === text.length; // ranges are only safe when lengths agree
  const first = q ? norm.indexOf(q) : -1;
  let start = 0;
  let end = Math.min(text.length, radius * 2);
  if (first >= 0) {
    start = Math.max(0, first - radius);
    end = Math.min(text.length, first + q.length + radius);
    // Don't cut words in half.
    if (start > 0) {
      const space = text.indexOf(" ", start);
      if (space >= 0 && space < first) start = space + 1;
    }
    if (end < text.length) {
      const space = text.lastIndexOf(" ", end);
      if (space > first + q.length) end = space;
    }
  }
  const body = text.slice(start, end);
  const ranges: [number, number][] = [];
  if (q && exact) {
    const hay = norm.slice(start, end);
    for (let i = hay.indexOf(q); i >= 0; i = hay.indexOf(q, i + q.length)) {
      ranges.push([i + (start > 0 ? 1 : 0), i + q.length + (start > 0 ? 1 : 0)]);
    }
  }
  return {
    snippet: `${start > 0 ? "…" : ""}${body}${end < text.length ? "…" : ""}`,
    ranges,
  };
}
