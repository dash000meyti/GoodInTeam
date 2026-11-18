"use client";

import { useMemo, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BookOpenIcon,
  ChevronRightIcon,
  FileTextIcon,
  IndentIcon,
  MoreHorizontalIcon,
  OutdentIcon,
  PanelRightOpenIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SelectField } from "@/components/shared/select-field";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { moveDocAction } from "@/server/modules/docs/actions";
import { useLocalState } from "./use-local-state";
import { VISIBILITY_ICONS, type DocVisibility } from "./visibility-badge";

export interface DocTreeItem {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  visibility: DocVisibility;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
}

interface Node extends DocTreeItem {
  children: Node[];
  /** Parent as displayed (null when the real parent isn't visible). */
  shownParentId: string | null;
}

type Zone = "before" | "after" | "inside";

function buildTree(items: DocTreeItem[]) {
  const map = new Map<string, Node>(
    items.map((i) => [i.id, { ...i, children: [], shownParentId: null }]),
  );
  const roots: Node[] = [];
  for (const node of map.values()) {
    const parent = node.parentId ? map.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) {
      node.shownParentId = parent.id;
      parent.children.push(node);
    } else roots.push(node);
  }
  return { roots, map };
}

/** Keep nodes that match (and their ancestors, for context). */
function filterTree(nodes: Node[], match: (n: Node) => boolean): Node[] {
  const out: Node[] = [];
  for (const n of nodes) {
    const children = filterTree(n.children, match);
    if (match(n) || children.length) out.push({ ...n, children });
  }
  return out;
}

/**
 * The page tree beside the docs pages (xl+): a sticky framed box whose rows
 * share hairlines — header (Docs + New page), search and filter, the tree
 * (scrolls inside the box), the archive link. Below xl the pages render
 * `DocsPagesBar` under their header instead.
 */
export function DocsSidebar({
  items,
  canEdit,
  archivedCount,
}: {
  items: DocTreeItem[];
  canEdit: boolean;
  archivedCount: number;
}) {
  return (
    <aside className="hidden xl:block">
      <FrameBox
        as="div"
        density="compact"
        className="sticky below-chrome flex max-h-chrome flex-col"
      >
        <TreePanel items={items} canEdit={canEdit} archivedCount={archivedCount} />
      </FrameBox>
    </aside>
  );
}

/**
 * Below xl: a toolbar box under the page header — the page tree in
 * a drawer and the docs search (the sidebar box takes over from xl).
 */
export function DocsPagesBar({
  items,
  canEdit,
  archivedCount,
}: {
  items: DocTreeItem[];
  canEdit: boolean;
  archivedCount: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <FrameBox as="div" density="compact" className="mb-6 xl:hidden print:hidden">
      <FrameGrid cols={1}>
        <FrameCell className="flex items-center gap-2 py-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <PanelRightOpenIcon className="ltr:rotate-180" /> {t.docs.showPages}
              </Button>
            </SheetTrigger>
            <SheetContent side="start" className="w-[88%] max-w-sm gap-0 p-0">
              <SheetTitle className="sr-only">{t.docs.pages}</SheetTitle>
              <div className="flex min-h-0 flex-1 flex-col">
                <TreePanel
                  items={items}
                  canEdit={canEdit}
                  archivedCount={archivedCount}
                  onNavigate={() => setOpen(false)}
                  inSheet
                />
              </div>
            </SheetContent>
          </Sheet>
          <SearchBox className="min-w-0 flex-1" />
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}

function SearchBox({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const onHome = /\/panel\/docs\/?$/.test(pathname);
  const current = onHome ? (params.get("q") ?? "") : "";
  return (
    <form
      role="search"
      key={current}
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        router.push(
          localePath(locale, q ? `/panel/docs?q=${encodeURIComponent(q)}` : "/panel/docs"),
        );
        onNavigate?.();
      }}
    >
      <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        type="search"
        defaultValue={current}
        placeholder={t.docs.searchPlaceholder}
        aria-label={t.common.search}
        className="h-9 ps-9"
      />
    </form>
  );
}

function TreePanel({
  items,
  canEdit,
  archivedCount,
  onNavigate,
  inSheet = false,
}: {
  items: DocTreeItem[];
  canEdit: boolean;
  archivedCount: number;
  onNavigate?: () => void;
  /** Rendered in the mobile drawer: leave room for its close button. */
  inSheet?: boolean;
}) {
  const t = useT();
  const d = t.docs;
  const locale = useLocale();
  const params = useParams<{ id?: string }>();
  const activeId = params.id ?? null;
  const [filter, setFilter] = useLocalState<string>("gt-docs-filter", "all");
  const [expandedList, setExpandedList] = useLocalState<string[]>("gt-docs-expanded", []);
  const [pending, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; zone: Zone } | null>(null);

  const { roots, map } = useMemo(() => buildTree(items), [items]);
  const projects = useMemo(() => {
    const seen = new Map<string, string>();
    for (const i of items) if (i.projectId && i.projectName) seen.set(i.projectId, i.projectName);
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [items]);

  const activeFilter =
    filter === "all" ||
    ["private", "team", "client"].includes(filter) ||
    projects.some((p) => `project:${p.id}` === filter)
      ? filter
      : "all";
  const tree = useMemo(() => {
    if (activeFilter === "all") return roots;
    if (activeFilter.startsWith("project:")) {
      const pid = activeFilter.slice(8);
      return filterTree(roots, (n) => n.projectId === pid);
    }
    return filterTree(roots, (n) => n.visibility === activeFilter);
  }, [roots, activeFilter]);

  // Ancestors of the active page open automatically (unless collapsed by hand).
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const ancestors = useMemo(() => {
    const set = new Set<string>();
    let cursor = activeId ? map.get(activeId)?.shownParentId : null;
    while (cursor && !set.has(cursor)) {
      set.add(cursor);
      cursor = map.get(cursor)?.shownParentId ?? null;
    }
    return set;
  }, [activeId, map]);
  const expanded = useMemo(
    () => new Set([...expandedList, ...ancestors].filter((id) => !collapsed.includes(id))),
    [expandedList, ancestors, collapsed],
  );

  const toggle = (id: string) => {
    if (expanded.has(id)) {
      setExpandedList((list) => list.filter((x) => x !== id));
      if (ancestors.has(id)) setCollapsed((c) => [...c, id]);
    } else {
      setExpandedList((list) => [...list.filter((x) => x !== id), id]);
      setCollapsed((c) => c.filter((x) => x !== id));
    }
  };

  const siblingsOf = (parentId: string | null) =>
    parentId ? (map.get(parentId)?.children ?? []) : roots;

  const move = (id: string, parentId: string | null, index: number) =>
    start(async () => {
      const res = await moveDocAction({ id, parentId, index });
      if (!res.ok) toast.error(res.error.message);
      else if (parentId) setExpandedList((l) => (l.includes(parentId) ? l : [...l, parentId]));
    });

  const isDescendant = (id: string, maybeAncestor: string) => {
    let cursor: string | null = id;
    while (cursor) {
      if (cursor === maybeAncestor) return true;
      cursor = map.get(cursor)?.shownParentId ?? null;
    }
    return false;
  };

  const actions = {
    moveBy: (node: Node, delta: -1 | 1) => {
      const sibs = siblingsOf(node.shownParentId);
      const i = sibs.findIndex((s) => s.id === node.id);
      const next = Math.min(Math.max(i + delta, 0), sibs.length - 1);
      if (next !== i) move(node.id, node.shownParentId, next);
    },
    indent: (node: Node) => {
      const sibs = siblingsOf(node.shownParentId);
      const prev = sibs[sibs.findIndex((s) => s.id === node.id) - 1];
      if (prev) move(node.id, prev.id, prev.children.length);
    },
    outdent: (node: Node) => {
      const parent = node.shownParentId ? map.get(node.shownParentId) : null;
      if (!parent) return;
      const grand = siblingsOf(parent.shownParentId).filter((s) => s.id !== node.id);
      move(node.id, parent.shownParentId, grand.findIndex((s) => s.id === parent.id) + 1);
    },
  };

  const dnd = canEdit && activeFilter === "all";
  const onDragOver = (e: DragEvent<HTMLDivElement>, node: Node) => {
    if (!dragId || dragId === node.id || isDescendant(node.id, dragId)) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    const zone: Zone = y < 0.28 ? "before" : y > 0.72 ? "after" : "inside";
    if (drop?.id !== node.id || drop.zone !== zone) setDrop({ id: node.id, zone });
  };
  const onDrop = (e: DragEvent<HTMLDivElement>, node: Node) => {
    e.preventDefault();
    const id = dragId;
    setDragId(null);
    setDrop(null);
    if (!id || !drop || id === node.id) return;
    if (drop.zone === "inside") {
      move(id, node.id, node.children.filter((c) => c.id !== id).length);
      return;
    }
    const sibs = siblingsOf(node.shownParentId).filter((s) => s.id !== id);
    const i = sibs.findIndex((s) => s.id === node.id);
    move(id, node.shownParentId, drop.zone === "before" ? i : i + 1);
  };

  const filterOptions = [
    { value: "all", label: d.filterAll },
    { value: "team", label: d.filterTeam },
    { value: "client", label: d.filterClient },
    { value: "private", label: d.filterPrivate },
    ...projects.map((p) => ({ value: `project:${p.id}`, label: `${d.project}: ${p.name}` })),
  ];

  const renderNode = (node: Node, depth: number): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const open = hasChildren && expanded.has(node.id);
    const active = node.id === activeId;
    const VisIcon = node.visibility === "team" ? null : VISIBILITY_ICONS[node.visibility];
    const sibs = siblingsOf(node.shownParentId);
    const index = sibs.findIndex((s) => s.id === node.id);
    const zone = drop?.id === node.id ? drop.zone : null;
    return (
      <li
        key={node.id}
        role="treeitem"
        aria-expanded={hasChildren ? open : undefined}
        aria-selected={active}
      >
        <div
          draggable={dnd}
          onDragStart={(e) => {
            setDragId(node.id);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", node.id);
          }}
          onDragEnd={() => {
            setDragId(null);
            setDrop(null);
          }}
          onDragOver={(e) => dnd && onDragOver(e, node)}
          onDragLeave={() => drop?.id === node.id && setDrop(null)}
          onDrop={(e) => dnd && onDrop(e, node)}
          className={cn(
            "group relative flex items-center gap-0.5 pe-2 text-sm transition-colors",
            active
              ? "bg-card font-semibold text-foreground"
              : "text-foreground/85 hover:bg-card hover:text-foreground",
            dragId === node.id && "opacity-40",
            zone === "inside" && "bg-primary/12 ring-1 ring-foreground/40 ring-inset",
            zone === "before" &&
              "before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:bg-foreground",
            zone === "after" &&
              "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground",
          )}
          style={{ paddingInlineStart: depth * 14 + 10 }}
        >
          {/* the open page: an ink bar on the start edge (the row is a cell-wide strip) */}
          {active && (
            <span aria-hidden className="absolute inset-y-1 start-0 w-0.5 bg-foreground" />
          )}
          <button
            type="button"
            tabIndex={hasChildren ? 0 : -1}
            aria-hidden={!hasChildren}
            aria-label={open ? d.collapse : d.expand}
            onClick={() => hasChildren && toggle(node.id)}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-grey-500/16",
              !hasChildren && "invisible",
            )}
          >
            <ChevronRightIcon
              className={cn("size-3.5 transition-transform", open ? "rotate-90" : "rtl:rotate-180")}
            />
          </button>
          <Link
            href={localePath(locale, `/panel/docs/${node.id}`)}
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 outline-none focus-visible:underline"
            draggable={false}
          >
            <span className="flex w-5 shrink-0 justify-center text-base leading-none" aria-hidden>
              {node.icon ?? <FileTextIcon className="size-4 text-muted-foreground" />}
            </span>
            <span className="truncate">
              <bdi>{node.title}</bdi>
            </span>
            {VisIcon && (
              <VisIcon
                className="size-3 shrink-0 text-muted-foreground"
                aria-label={d[`visibility_${node.visibility}`]}
              />
            )}
          </Link>
          {canEdit && (
            <div className="flex shrink-0 items-center opacity-100 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 lg:opacity-0">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                asChild
                aria-label={d.newChild}
                title={d.newChild}
              >
                <Link
                  href={localePath(locale, `/panel/docs/new?parentId=${node.id}`)}
                  onClick={onNavigate}
                >
                  <PlusIcon className="size-3.5" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6"
                    aria-label={d.pageActions}
                  >
                    <MoreHorizontalIcon className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    disabled={index <= 0 || pending}
                    onSelect={() => actions.moveBy(node, -1)}
                  >
                    <ArrowUpIcon /> {d.moveUp}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={index >= sibs.length - 1 || pending}
                    onSelect={() => actions.moveBy(node, 1)}
                  >
                    <ArrowDownIcon /> {d.moveDown}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={index <= 0 || pending}
                    onSelect={() => actions.indent(node)}
                  >
                    <IndentIcon className="rtl:-scale-x-100" /> {d.indent}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!node.shownParentId || pending}
                    onSelect={() => actions.outdent(node)}
                  >
                    <OutdentIcon className="rtl:-scale-x-100" /> {d.outdent}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        {open && <ul role="group">{node.children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    );
  };

  // Rows of the box (FrameGrids sharing hairlines): in the sidebar box on large
  // screens, in the drawer on phones (where the overlay drops the markers).
  return (
    <>
      <FrameGrid cols={1}>
        <FrameCell
          className={cn("flex items-center justify-between gap-2 py-3", inSheet && "pe-12")}
        >
          <Link
            href={localePath(locale, "/panel/docs")}
            onClick={onNavigate}
            className="flex min-w-0 items-center gap-2 font-bold hover:text-primary-ink"
          >
            <BookOpenIcon className="size-4 shrink-0 text-primary-ink" />
            <span className="truncate">{d.title}</span>
          </Link>
          {canEdit && (
            <Button size="sm" variant="outline" asChild>
              <Link href={localePath(locale, "/panel/docs/new")} onClick={onNavigate}>
                <PlusIcon /> {d.newPage}
              </Link>
            </Button>
          )}
        </FrameCell>
      </FrameGrid>
      {(!inSheet || items.length > 0) && (
        <FrameGrid cols={1}>
          <FrameCell className="space-y-2.5 py-3">
            {/* phones search from the toolbar box beside the drawer button */}
            {!inSheet && <SearchBox onNavigate={onNavigate} />}
            {items.length > 0 && (
              <SelectField
                value={activeFilter}
                onChange={setFilter}
                options={filterOptions}
                size="sm"
                className="w-full"
              />
            )}
          </FrameCell>
        </FrameGrid>
      )}
      <FrameGrid cols={1} className="min-h-0 flex-1 grid-rows-[minmax(0,1fr)]">
        <FrameCell pad="none" className="flex min-h-0 flex-col">
          <nav
            aria-label={d.pages}
            aria-busy={pending}
            className={cn("min-h-0 flex-1 overflow-y-auto py-2", pending && "opacity-70")}
          >
            {tree.length === 0 ? (
              <p className="px-(--cell-pad) py-6 text-center text-sm text-muted-foreground">
                {items.length === 0 ? d.emptyTree : d.noMatches}
              </p>
            ) : (
              <ul role="tree" aria-label={d.pages}>
                {tree.map((n) => renderNode(n, 0))}
              </ul>
            )}
            {dnd && items.length > 1 && (
              <p className="mt-3 hidden px-(--cell-pad) text-[11px] text-muted-foreground lg:block">
                {d.dragHint}
              </p>
            )}
          </nav>
        </FrameCell>
      </FrameGrid>
      {canEdit && (
        <FrameGrid cols={1}>
          <FrameCell pad="none">
            <Link
              href={localePath(locale, "/panel/docs/archive")}
              onClick={onNavigate}
              className="flex items-center gap-2 px-(--cell-pad) py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <ArchiveIcon className="size-4" /> {d.archive}
              {archivedCount > 0 && (
                <Badge variant="neutral" className="ms-auto">
                  {formatNumber(archivedCount, locale)}
                </Badge>
              )}
            </Link>
          </FrameCell>
        </FrameGrid>
      )}
    </>
  );
}
