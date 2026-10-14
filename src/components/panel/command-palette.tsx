"use client";

import { useRouter } from "next/navigation";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import type { UserRole } from "@/server/db/schema/auth";
import { navForRole } from "./nav-config";
import { usePanelUI } from "./panel-ui";

/**
 * ⌘K / Ctrl+K palette. Modules can register extra commands later via
 * `extraCommands` (e.g. "start timer for …").
 */
export function CommandPalette({
  role,
  extraCommands = [],
}: {
  role: UserRole;
  extraCommands?: { id: string; label: string; group: string; run: () => void }[];
}) {
  const { paletteOpen, setPaletteOpen } = usePanelUI();
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const { setTheme, resolvedTheme } = useTheme();
  const go = (href: string) => {
    setPaletteOpen(false);
    router.push(localePath(locale, href));
  };
  const groups: Record<string, typeof extraCommands> = {};
  for (const c of extraCommands) (groups[c.group] ??= []).push(c);

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} title={t.common.commandPalette}>
      <CommandInput placeholder={t.common.searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{t.common.empty}</CommandEmpty>
        {navForRole(role).map((g) => (
          <CommandGroup key={g.label} heading={t.nav[g.label]}>
            {g.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href + item.label}
                  value={`${t.nav[item.label]} ${item.href}`}
                  onSelect={() => go(item.href)}
                >
                  <Icon /> {t.nav[item.label]}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        {Object.entries(groups).map(([group, cmds]) => (
          <CommandGroup key={group} heading={group}>
            {cmds.map((c) => (
              <CommandItem
                key={c.id}
                value={c.label}
                onSelect={() => {
                  setPaletteOpen(false);
                  c.run();
                }}
              >
                {c.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading={t.common.theme}>
          <CommandItem
            onSelect={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
              setPaletteOpen(false);
            }}
          >
            {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />} {t.common.toggleTheme}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
