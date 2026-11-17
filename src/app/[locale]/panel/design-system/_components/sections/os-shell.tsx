import { AppWindowIcon } from "lucide-react";
import { Window } from "@/components/shell/window";
import { FrameCell, FrameGrid, FrameSection, framePath } from "@/components/site/frame";
import type { Messages } from "@/i18n/messages";
import { Example } from "../example";
import { DsSection } from "../section";

/**
 * STUB (foundation): proves the frame primitives in the panel and that the
 * hairline between stacked grids stays visible. The panel-shell track owns
 * this file afterwards (menu bar, dock and window examples).
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

export function OsShellSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="os-shell"
      title={d.sec_osShell}
      description={d.osShellIntro}
      icon={AppWindowIcon}
    >
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
    </DsSection>
  );
}
