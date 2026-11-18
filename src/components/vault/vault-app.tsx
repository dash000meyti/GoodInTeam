"use client";

import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  FolderKanbanIcon,
  KeyRoundIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
  SlidersHorizontalIcon,
  StarIcon,
  WandSparklesIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { SelectField } from "@/components/shared/select-field";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber, type FormatOptions } from "@/lib/format";
import { decryptItem, isVaultCryptoAvailable } from "@/lib/vault-crypto";
import { cn } from "@/lib/utils";
import { ItemRow } from "./item-row";
import { ItemDetail, type LinkOption } from "./item-detail";
import { ItemFormDialog, type ItemFormTarget } from "./item-form";
import {
  normalizePayload,
  searchTextOf,
  TYPE_ICONS,
  VAULT_ITEM_TYPES,
  type VaultEntry,
  type VaultItemRecord,
  type VaultItemType,
  type VaultPayload,
} from "./item-types";
import { PasswordGenerator } from "./password-generator";
import { SetupWizard } from "./setup-wizard";
import { UnlockScreen } from "./unlock-screen";
import { VaultProvider, useVault, useVaultKey } from "./vault-provider";
import { VaultSettings, type MaterialWithDates } from "./vault-settings";

export interface VaultAppProps {
  material: MaterialWithDates | null;
  items: VaultItemRecord[];
  projects: LinkOption[];
  clients: LinkOption[];
  /** Shown in the recovery-key file ("name <email>"). */
  account: string;
  fmt: FormatOptions;
}

/** Entry point of /panel/vault: provider + setup / unlock / workspace switch. */
export function VaultApp(props: VaultAppProps) {
  return (
    <VaultProvider material={props.material}>
      <VaultGate {...props} />
    </VaultProvider>
  );
}

const noopSubscribe = () => () => {};

function VaultGate(props: VaultAppProps) {
  const t = useT();
  const v = t.vault;
  const locale = useLocale();
  const { status } = useVault();
  // SubtleCrypto exists only in secure contexts (HTTPS / localhost).
  const supported = useSyncExternalStore(noopSubscribe, isVaultCryptoAvailable, () => true);
  const crumbs = [
    { label: t.nav.dashboard, href: localePath(locale, "/panel") },
    { label: v.title },
  ];

  if (status === "unlocked" && supported) return <VaultWorkspace {...props} crumbs={crumbs} />;

  return (
    <>
      <PageHeader
        title={v.title}
        description={v.subtitle}
        crumbs={crumbs}
        actions={
          <Badge variant="success" className="px-2 py-1 text-xs">
            <ShieldCheckIcon /> {v.zeroKnowledge}
          </Badge>
        }
      />
      {!supported ? (
        <EmptyState
          icon={ShieldOffIcon}
          title={v.unsupportedTitle}
          description={v.unsupportedBody}
        />
      ) : status === "setup" ? (
        <SetupWizard account={props.account} />
      ) : (
        <UnlockScreen account={props.account} />
      )}
    </>
  );
}

/** Decrypt the server rows in the browser (cached per id+iv while unlocked). */
function useDecryptedItems(records: VaultItemRecord[], key: CryptoKey) {
  const cache = useRef(new Map<string, VaultPayload | null>());
  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const out = await Promise.all(
        records.map(async ({ ciphertext, iv, ...rest }) => {
          const ck = `${rest.id}:${iv}`;
          let payload = cache.current.get(ck);
          if (payload === undefined) {
            try {
              payload = normalizePayload(await decryptItem(key, { ciphertext, iv }), rest.type);
            } catch {
              payload = null;
            }
            cache.current.set(ck, payload);
          }
          return { ...rest, payload } satisfies VaultEntry;
        }),
      );
      if (!cancelled) setEntries(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [records, key]);
  return entries;
}

const collator = (locale: string) =>
  new Intl.Collator(locale, { sensitivity: "base", numeric: true });

function VaultWorkspace({
  material,
  items,
  projects,
  clients,
  account,
  fmt,
  crumbs,
}: VaultAppProps & { crumbs: { label: string; href?: string }[] }) {
  const t = useT();
  const v = t.vault;
  const locale = useLocale();
  const key = useVaultKey();
  const { lock } = useVault();
  const entries = useDecryptedItems(items, key);

  const [tab, setTab] = useState("items");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [typeFilter, setTypeFilter] = useState<VaultItemType | "all">("all");
  const [projectFilter, setProjectFilter] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<ItemFormTarget | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close overlays with secrets when Next.js hides this page (client navigation).
  useLayoutEffect(
    () => () => {
      setDetailOpen(false);
      setFormTarget(null);
    },
    [],
  );

  // "/" focuses search, like many apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || el?.closest("input, textarea, [contenteditable=true], [role=dialog]"))
        return;
      e.preventDefault();
      setTab("items");
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const typeOf = (e: VaultEntry) => e.payload?.type ?? e.type;

  const counts = useMemo(() => {
    const c = new Map<VaultItemType, number>();
    for (const e of entries ?? []) c.set(typeOf(e), (c.get(typeOf(e)) ?? 0) + 1);
    return c;
  }, [entries]);

  const usedProjects = useMemo(() => {
    const ids = new Set((entries ?? []).map((e) => e.projectId).filter(Boolean));
    return projects.filter((p) => ids.has(p.id));
  }, [entries, projects]);

  const groups = useMemo(() => {
    if (!entries) return [];
    const q = deferredQuery.trim().toLowerCase();
    const sorter = collator(locale);
    const filtered = entries.filter(
      (e) =>
        (typeFilter === "all" || typeOf(e) === typeFilter) &&
        (!projectFilter || e.projectId === projectFilter) &&
        (!favOnly || e.favorite) &&
        (!q || (e.payload ? searchTextOf(e.payload).includes(q) : false)),
    );
    return VAULT_ITEM_TYPES.map((type) => ({
      type,
      items: filtered
        .filter((e) => typeOf(e) === type)
        .sort(
          (a, b) =>
            Number(b.favorite) - Number(a.favorite) ||
            sorter.compare(a.payload?.title ?? "", b.payload?.title ?? ""),
        ),
    })).filter((g) => g.items.length > 0);
  }, [entries, deferredQuery, typeFilter, projectFilter, favOnly, locale]);

  const filtersActive = !!query || typeFilter !== "all" || !!projectFilter || favOnly;
  const selected = entries?.find((e) => e.id === selectedId) ?? null;
  const openNew = (type: VaultItemType) =>
    setFormTarget({ type, projectId: projectFilter || null });

  const newMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <PlusIcon /> {v.newItem}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {VAULT_ITEM_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type];
          return (
            <DropdownMenuItem key={type} onSelect={() => openNew(type)}>
              <Icon /> {v[`type_${type}`]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <PageHeader
        title={v.title}
        description={
          <span className="flex items-center gap-1.5">
            <ShieldCheckIcon className="size-4 shrink-0 text-success-ink" /> {v.autoLockHint}
          </span>
        }
        crumbs={crumbs}
        actions={
          <>
            <Button variant="outline" onClick={() => lock("manual")} data-testid="vault-lock">
              <LockIcon /> {v.lock}
            </Button>
            {newMenu}
          </>
        }
      >
        {/* The framed tab strip: the page box's last row. */}
        <FrameGrid cols={1}>
          <FrameCell className="py-3">
            <TabsList className="-mx-1 max-w-[calc(100%+0.5rem)] scrollbar-thin justify-start overflow-x-auto px-1 py-0.5 max-sm:[&_svg]:hidden">
              <TabsTrigger value="items" className="flex-none">
                <KeyRoundIcon /> {v.tabItems}
                {entries && (
                  <span className="text-xs tabular-nums opacity-80">
                    {formatNumber(entries.length, locale)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="generator" className="flex-none">
                <WandSparklesIcon /> {v.tabGenerator}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-none">
                <SlidersHorizontalIcon />
                <span className="sm:hidden">{v.tabSettingsShort}</span>
                <span className="hidden sm:inline">{v.tabSettings}</span>
              </TabsTrigger>
            </TabsList>
          </FrameCell>
        </FrameGrid>
      </PageHeader>

      <TabsContent value="items">
        {entries === null ? (
          <FrameBox as="div" density="compact" ariaLabel={v.decrypting}>
            <FrameGrid cols={1} className="xl:grid-cols-2">
              {Array.from({ length: Math.min(Math.max(Math.ceil(items.length / 2), 2), 4) }).map(
                (_, i) => (
                  <FrameCell key={i} className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </FrameCell>
                ),
              )}
            </FrameGrid>
          </FrameBox>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={KeyRoundIcon}
            title={v.emptyTitle}
            description={v.emptyBody}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {(["login", "server", "database", "api_key"] as const).map((type) => {
                  const Icon = TYPE_ICONS[type];
                  return (
                    <Button key={type} variant="outline" onClick={() => openNew(type)}>
                      <Icon /> {v[`type_${type}`]}
                    </Button>
                  );
                })}
              </div>
            }
          />
        ) : (
          <FrameBox as="section" density="compact" ariaLabel={v.tabItems}>
            {/* First row: search, project and favourites; the type chips under them. */}
            <FrameGrid cols={1}>
              <FrameCell className="space-y-3 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchRef}
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={v.searchPlaceholder}
                      className="ps-9"
                      aria-label={t.common.search}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex gap-2">
                    {usedProjects.length > 0 && (
                      <SelectField
                        value={projectFilter}
                        onChange={setProjectFilter}
                        noneLabel={v.allProjects}
                        placeholder={v.allProjects}
                        className="w-full md:w-52"
                        options={usedProjects.map((p) => ({
                          value: p.id,
                          label: p.name,
                          icon: <FolderKanbanIcon className="size-4" />,
                        }))}
                      />
                    )}
                    <Button
                      variant={favOnly ? "soft" : "outline"}
                      onClick={() => setFavOnly((f) => !f)}
                      aria-pressed={favOnly}
                      className="shrink-0"
                    >
                      <StarIcon className={cn(favOnly && "fill-warning text-warning-ink")} />
                      <span className="hidden sm:inline">{v.favoritesOnly}</span>
                    </Button>
                  </div>
                </div>
                <div
                  className="-mx-1 flex scrollbar-thin gap-1.5 overflow-x-auto px-1 py-0.5"
                  role="tablist"
                  aria-label={v.itemType}
                >
                  {(["all", ...VAULT_ITEM_TYPES] as const)
                    .filter((ty) => ty === "all" || counts.get(ty))
                    .map((ty) => {
                      const Icon = ty === "all" ? null : TYPE_ICONS[ty];
                      const active = typeFilter === ty;
                      const n = ty === "all" ? entries.length : (counts.get(ty) ?? 0);
                      return (
                        <button
                          key={ty}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setTypeFilter(ty)}
                          className={cn(
                            "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold whitespace-nowrap transition-colors",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-frame-line bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                          )}
                        >
                          {Icon && <Icon className="size-3.5" />}
                          {ty === "all" ? v.allTypes : v[`type_${ty}`]}
                          <span className={cn("text-xs tabular-nums", active && "opacity-80")}>
                            {formatNumber(n, locale)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </FrameCell>
            </FrameGrid>

            {groups.length === 0 ? (
              <FrameGrid cols={1}>
                <FrameCell>
                  <EmptyState
                    icon={SearchIcon}
                    title={v.noResults}
                    className="py-8"
                    action={
                      filtersActive && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setQuery("");
                            setTypeFilter("all");
                            setProjectFilter("");
                            setFavOnly(false);
                          }}
                        >
                          <XIcon /> {v.clearFilters}
                        </Button>
                      )
                    }
                  />
                </FrameCell>
              </FrameGrid>
            ) : (
              // One cell per item type, two columns from xl; a dots filler completes the last row.
              <FrameGrid cols={1} className="xl:grid-cols-2">
                {groups.map(({ type, items: list }) => {
                  const Icon = TYPE_ICONS[type];
                  return (
                    <FrameCell
                      key={type}
                      as="section"
                      pad="none"
                      aria-labelledby={`vault-group-${type}`}
                    >
                      <h3
                        id={`vault-group-${type}`}
                        className="flex min-h-12 items-center gap-2 border-b border-frame-line px-(--cell-pad) py-3 text-sm font-bold"
                      >
                        <Icon className="size-4 text-muted-foreground" /> {v[`type_${type}`]}
                        <Badge variant="neutral" className="ms-auto">
                          {formatNumber(list.length, locale)}
                        </Badge>
                      </h3>
                      <ul className="divide-y divide-dashed divide-frame-line">
                        {list.map((e) => (
                          <ItemRow
                            key={e.id}
                            entry={e}
                            project={e.projectId ? projectMap.get(e.projectId) : null}
                            onOpen={() => {
                              setSelectedId(e.id);
                              setDetailOpen(true);
                            }}
                          />
                        ))}
                      </ul>
                    </FrameCell>
                  );
                })}
                {groups.length % 2 === 1 && (
                  <FrameCell tone="dots" aria-hidden className="hidden xl:block" />
                )}
              </FrameGrid>
            )}
          </FrameBox>
        )}
      </TabsContent>

      <TabsContent value="generator">
        <FrameBox as="section" density="compact" className="max-w-2xl" ariaLabel={v.tabGenerator}>
          <FrameGrid cols={1}>
            <FrameCell pad="lg">
              <PasswordGenerator />
            </FrameCell>
          </FrameGrid>
        </FrameBox>
      </TabsContent>

      <TabsContent value="settings">
        {material && (
          <VaultSettings
            material={material}
            records={items}
            entries={entries ?? []}
            projects={projects}
            clients={clients}
            account={account}
            fmt={fmt}
          />
        )}
      </TabsContent>

      <ItemDetail
        entry={selected}
        open={detailOpen && !!selected}
        onOpenChange={setDetailOpen}
        onEdit={(e) => {
          setDetailOpen(false);
          setFormTarget({ entry: e, type: e.payload?.type ?? e.type });
        }}
        projects={projects}
        clients={clients}
        fmt={fmt}
      />
      <ItemFormDialog
        target={formTarget}
        onOpenChange={(o) => !o && setFormTarget(null)}
        projects={projects}
        clients={clients}
        onSaved={(id) => {
          setSelectedId(id);
          setDetailOpen(true);
        }}
      />
    </Tabs>
  );
}
