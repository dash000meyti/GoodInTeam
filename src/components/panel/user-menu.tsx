"use client";

import Link from "next/link";
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { initials } from "@/lib/utils";
import type { SessionUser } from "@/server/auth/actor";
import { logout } from "@/server/modules/auth/actions";

export function UserMenu({
  user,
}: {
  user: Pick<SessionUser, "name" | "email" | "avatarUrl" | "role">;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        aria-label={t.panel.profile}
      >
        <Avatar className="size-9 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-sm font-bold text-foreground">{user.name}</span>
          <span className="truncate text-xs font-normal" dir="ltr">
            {user.email}
          </span>
          <span className="text-[11px] font-semibold text-primary">
            {t.panel[`role_${user.role}`]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={localePath(locale, "/panel/settings")}>
            <UserIcon /> {t.panel.profile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={localePath(locale, "/panel/settings")}>
            <SettingsIcon /> {t.common.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
          <LogOutIcon /> {t.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
