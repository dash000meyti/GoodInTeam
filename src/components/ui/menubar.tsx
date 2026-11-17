"use client";

import * as React from "react";
import { Menubar as MenubarPrimitive } from "radix-ui";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * shadcn-style wrapper over Radix Menubar for the panel OS menu bar (spec §11.2).
 * Content and rows use the shared OS menu look (`.os-menu` / `.os-menu-item`,
 * os-shell.css): opaque 97% surface, no blur, yellow-fill highlight with an
 * inset ring; destructive rows set `data-variant="destructive"`. Keyboard:
 * full ARIA menubar (roving focus, arrows mirrored in RTL via DirectionProvider).
 */

function Menubar({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  return (
    <MenubarPrimitive.Root
      data-slot="menubar"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  );
}

function MenubarMenu(props: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />;
}

function MenubarGroup(props: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />;
}

function MenubarPortal(props: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />;
}

/** A menu title in the bar (`.os-mb-item`; open state `[data-state=open]`). */
function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn("os-mb-item outline-none select-none", className)}
      {...props}
    />
  );
}

const contentMotion =
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none";

function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content>) {
  return (
    <MenubarPortal>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "os-menu z-50 max-h-(--radix-menubar-content-available-height) origin-(--radix-menubar-content-transform-origin) overflow-x-hidden overflow-y-auto outline-none",
          contentMotion,
          className,
        )}
        {...props}
      />
    </MenubarPortal>
  );
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "os-menu-item relative select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={cn(
        "os-menu-item relative ps-8 select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute start-2.5 flex size-4 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5" strokeWidth={2.5} />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
}

function MenubarRadioGroup(props: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  return (
    <MenubarPrimitive.RadioItem
      data-slot="menubar-radio-item"
      className={cn(
        "os-menu-item relative ps-8 select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute start-2.5 flex size-4 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5" strokeWidth={2.5} />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & { inset?: boolean }) {
  return (
    <MenubarPrimitive.Label
      data-slot="menubar-label"
      data-inset={inset}
      className={cn("os-menu-label font-semibold data-[inset]:ps-8", className)}
      {...props}
    />
  );
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator
      data-slot="menubar-separator"
      className={cn("os-menu-sep", className)}
      {...props}
    />
  );
}

/** Right-aligned shortcut hint (LTR, isolated), e.g. `⌘K`. */
function MenubarShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="menubar-shortcut"
      dir="ltr"
      className={cn("os-menu-shortcut [[data-highlighted]>&]:text-current", className)}
      {...props}
    />
  );
}

function MenubarSub(props: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <MenubarPrimitive.SubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        "os-menu-item select-none data-[inset]:ps-8 data-[state=open]:bg-[rgb(var(--grey-rgb)/0.14)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ms-auto size-3.5 opacity-70 rtl:rotate-180" aria-hidden />
    </MenubarPrimitive.SubTrigger>
  );
}

function MenubarSubContent({
  className,
  sideOffset = 2,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return (
    <MenubarPortal>
      <MenubarPrimitive.SubContent
        data-slot="menubar-sub-content"
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "os-menu z-50 min-w-40 origin-(--radix-menubar-content-transform-origin) overflow-hidden outline-none",
          contentMotion,
          className,
        )}
        {...props}
      />
    </MenubarPortal>
  );
}

export {
  Menubar,
  MenubarMenu,
  MenubarGroup,
  MenubarPortal,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarLabel,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
};
