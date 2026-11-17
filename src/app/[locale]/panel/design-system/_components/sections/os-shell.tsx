import {
  AppWindowIcon,
  CalendarDaysIcon,
  CheckSquareIcon,
  FolderKanbanIcon,
  GlobeIcon,
  TimerIcon,
} from "lucide-react";
import { PixelAvatar } from "@/components/brand/pixel-art";
import { PixelMark } from "@/components/brand/pixel-logo";
import { Dock, DockTile, type DockEntry } from "@/components/shell/dock";
import { DockLinks } from "@/components/shell/dock-links";
import { OsLights } from "@/components/shell/os-lights";
import { Window } from "@/components/shell/window";
import { FrameCell, FrameGrid, FrameSection, framePath } from "@/components/site/frame";
import type { Messages } from "@/i18n/messages";
import { ClockDemo, MenubarDemo } from "../demos";
import { Example } from "../example";
import { DsSection } from "../section";

/**
 * Catalog → OS shell: the menu bar (MenuBarShell + Radix Menubar), the dock
 * (a non-fixed demo via `pm-dock-demo`), windows, lights, the clock and the
 * frame primitives. Static samples: the real chrome lives in the panel layout.
 */
const frameCode = `import { FrameCell, FrameGrid, FrameSection, framePath } from "@/components/site/frame";
<FrameSection id="x" labelledBy="x-title" strip={{ index: 1, path: framePath("good-in-team", "x") }}
  guide={{ key: "x", say: t.guide.x }}>
  <FrameGrid cols={1}><FrameCell header>…h2#x-title…</FrameCell></FrameGrid>
  <FrameGrid cols={3}>
    <FrameCell>…</FrameCell><FrameCell tone="card">…</FrameCell><FrameCell tone="dots">…</FrameCell>
  </FrameGrid>
</FrameSection>`;

const windowCode = `import { Window } from "@/components/shell/window";
<Window path={[{ id: "PORTAL", text: "PORTAL" }, { id: "PROGRESS", text: "PROGRESS" }]}>…</Window>
// one svg, one path per item; swap with :has(… .px-set>[data-path-id=PROGRESS])`;

const menubarCode = `import { MenuBarShell, MB_ICON_CLASS } from "@/components/shell/menubar-shell";
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem,
  MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarSub, MenubarSubTrigger,
  MenubarSubContent, MenubarSeparator, MenubarLabel, MenubarShortcut } from "@/components/ui/menubar";
// Panel: components/panel/menu-bar.tsx — ONE Menubar root (Brand · App · nav menus).
<MenuBarShell label={t.common.menuBar}
  start={<Menubar dir={dir} loop>
    <MenubarMenu>
      <MenubarTrigger aria-label={t.nav.brandMenu}><PixelMark cell={2} /></MenubarTrigger>
      <MenubarContent>
        <MenubarItem asChild><Link href="/panel">…</Link></MenubarItem>
        <MenubarSeparator />
        <MenubarItem variant="destructive" onSelect={() => void logout()}>…</MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>}
  end={<button className={MB_ICON_CLASS} aria-label={t.common.search}>…</button>} />`;

const dockCode = `import { Dock, type DockEntry } from "@/components/shell/dock";
import { DockLinks } from "@/components/shell/dock-links";
// Panel: components/panel/panel-dock.tsx (role-filtered from nav-config.ts).
const entries: DockEntry[] = [
  { kind: "slot", key: "me", show: "desktop", node: <MeTile guide={guide} /> },
  { kind: "sep", key: "s1", show: "desktop" },
  { kind: "link", key: "time", href, section: "/panel/time", label: t.nav.time,
    icon: <TimerIcon className="pm-dock-icon" />, variant: "brand",
    srExtra: ", 2 running", attrs: { "data-dock-app": "" } },
];
<Dock label={t.panel.mainNav} tabbar="lg" magnify n={18} seps={7}>
  <DockLinks entries={entries} running={["time"]} />
</Dock>`;

const lightsCode = `import { OsLights } from "@/components/shell/os-lights";
import { OsClock, ClockSkeleton } from "@/components/shell/os-clock";
<OsLights size={12} />
<Suspense fallback={<ClockSkeleton />}><OsClock locale={locale} tz={tz} label={t.common.studioTime} /></Suspense>`;

export function OsShellSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  const demoDock: DockEntry[] = [
    {
      kind: "slot",
      key: "me",
      node: (
        <span className="os-dock-item" aria-hidden>
          <DockTile variant="brand">
            <PixelAvatar part="head" cell={2} />
          </DockTile>
        </span>
      ),
    },
    { kind: "sep", key: "s1" },
    {
      kind: "link",
      key: "home",
      href: "#os-shell",
      label: t.panel.desktop,
      variant: "mark",
      icon: <PixelMark cell={2} className="md:[--cell:3px]" />,
    },
    { kind: "sep", key: "s2" },
    ...(
      [
        ["time", TimerIcon],
        ["calendar", CalendarDaysIcon],
        ["tasks", CheckSquareIcon],
        ["projects", FolderKanbanIcon],
      ] as const
    ).map(([key, Icon]): DockEntry => ({
      kind: "link",
      key,
      href: "#os-shell",
      label: t.nav[key],
      variant: "brand",
      icon: <Icon className="pm-dock-icon" strokeWidth={1.75} aria-hidden />,
    })),
    { kind: "sep", key: "s3" },
    {
      kind: "link",
      key: "site",
      href: "#os-shell",
      label: t.panel.viewSite,
      icon: <GlobeIcon className="pm-dock-icon" strokeWidth={1.75} aria-hidden />,
    },
  ];
  return (
    <DsSection
      id="os-shell"
      title={d.sec_osShell}
      description={d.osShellIntro}
      icon={AppWindowIcon}
    >
      <Example
        title={d.osShellMenubar}
        description={d.osShellMenubarHint}
        code={menubarCode}
        previewClassName="block"
      >
        <MenubarDemo />
      </Example>

      <Example
        title={d.osShellDock}
        description={d.osShellDockHint}
        code={dockCode}
        previewClassName="block pt-16 pb-8"
      >
        <Dock label={d.osShellDockDemo} tabbar="md" magnify className="pm-dock-demo">
          <DockLinks entries={demoDock} running={["time"]} />
        </Dock>
      </Example>

      <Example
        title={d.osShellFrame}
        description={d.osShellFrameHint}
        code={frameCode}
        previewClassName="block p-0 sm:p-0 [&_.frame-box]:mb-8"
      >
        <FrameSection
          id="ds-frame-demo"
          labelledBy="ds-frame-demo-title"
          strip={{ index: 1, path: framePath("good-in-team", "os-shell") }}
        >
          <FrameGrid cols={1}>
            <FrameCell header>
              <h3 id="ds-frame-demo-title" className="text-lg font-bold">
                {d.osShellFrame}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{d.osShellFrameHint}</p>
            </FrameCell>
          </FrameGrid>
          <FrameGrid cols={3}>
            <FrameCell>
              <code className="text-xs" dir="ltr">
                tone=&quot;default&quot;
              </code>
            </FrameCell>
            <FrameCell tone="card" hover>
              <code className="text-xs" dir="ltr">
                tone=&quot;card&quot; hover
              </code>
            </FrameCell>
            <FrameCell tone="dots" pad="lg">
              <Window
                path={[
                  { id: "PORTAL", text: "PORTAL" },
                  { id: "PROGRESS", text: "PROGRESS" },
                ]}
              >
                <p className="p-4 text-xs text-muted-foreground">{d.osShellWindow}</p>
              </Window>
            </FrameCell>
          </FrameGrid>
        </FrameSection>
      </Example>

      <Example title={d.osShellWindow} code={windowCode} previewClassName="gap-5">
        <Window path="SYSTEM.APP" elevated className="w-64">
          <p className="p-4 text-xs text-muted-foreground">elevated</p>
        </Window>
        <Window path="COURSE.APP" tone="ink" className="w-64">
          <p className="p-4 text-xs">tone=&quot;ink&quot;</p>
        </Window>
      </Example>

      <Example
        title={d.osShellLights}
        description={d.osShellLightsHint}
        code={lightsCode}
        previewClassName="items-center justify-between gap-6"
      >
        <span className="flex items-center gap-6">
          <OsLights size={10} />
          <OsLights size={12} />
          <span className="os-win" data-elevated="">
            <span className="os-win-bar">
              <OsLights size={12} />
            </span>
          </span>
        </span>
        <ClockDemo />
      </Example>
    </DsSection>
  );
}
