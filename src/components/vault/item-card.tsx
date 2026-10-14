"use client";

import { CopyIcon, FolderKanbanIcon, StarIcon, TriangleAlertIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useVaultCopy } from "./clipboard";
import type { LinkOption } from "./item-detail";
import { primarySecretOf, subtitleOf, TYPE_ICONS, TYPE_TONES, type VaultEntry } from "./item-types";

/** List card: icon tile, title, non-secret subtitle, quick-copy actions. */
export function ItemCard({
  entry,
  project,
  onOpen,
}: {
  entry: VaultEntry;
  project?: LinkOption | null;
  onOpen: () => void;
}) {
  const t = useT();
  const v = t.vault;
  const copy = useVaultCopy();
  const p = entry.payload;
  const type = p?.type ?? entry.type;
  const Icon = p ? TYPE_ICONS[type] : TriangleAlertIcon;
  const secret = p ? primarySecretOf(p) : null;
  const username = p?.fields.username ?? p?.fields.user;
  const subtitle = p ? subtitleOf(p) : v.unreadable;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card transition-shadow hover:shadow-dropdown dark:border dark:border-border",
        !p && "border border-dashed border-destructive/40",
      )}
      data-testid="vault-item"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          p ? TYPE_TONES[type] : "bg-destructive/12 text-destructive",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full min-w-0 cursor-pointer items-center gap-1.5 text-start font-bold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/40"
        >
          <span className="truncate" dir="auto">
            {p ? p.title || v.untitled : v.unreadable}
          </span>
          {entry.favorite && (
            <StarIcon
              className="size-3.5 shrink-0 fill-warning text-warning"
              aria-label={v.favorite}
            />
          )}
        </button>
        <p className="truncate text-xs text-muted-foreground" dir="auto">
          {subtitle || v[`type_${type}`]}
        </p>
        {project && (
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-muted-foreground">
            <FolderKanbanIcon className="size-3 shrink-0" />
            <span className="truncate">{project.name}</span>
          </p>
        )}
      </div>
      {p && (username || secret) && (
        <div className="relative z-10 flex shrink-0 items-center gap-0.5 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          {username && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={v.copyUsername}
              title={v.copyUsername}
              onClick={() => copy.plain(username)}
            >
              <UserIcon />
            </Button>
          )}
          {secret && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={v.quickCopy}
              title={v.quickCopy}
              onClick={() => copy.secret(secret)}
            >
              <CopyIcon />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
