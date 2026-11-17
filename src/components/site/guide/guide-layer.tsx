import { PixelAvatarSprite } from "@/components/brand/pixel-art";
import type { GuideLabels } from "./guide-engine";
import { GuideLoader } from "./guide-loader";

/**
 * The guide layer's static DOM (spec §10.2), server-rendered inside
 * `.os-desktop` after the footer: an absolute, clipped, pointer-transparent
 * layer holding the selection box, the sprite button in nested x/y wrappers
 * (arc flights), the bubble (outside the wrappers, so it can be fixed in
 * compact mode) and the polite live region. The sprite has no `cell` prop:
 * guide.css sizes it (3px desktop, 2px compact). Lines are never rendered
 * here: the engine reads `data-guide-say` from the page.
 */
export function GuideLayer({
  greeting,
  labels,
}: {
  greeting: { full: string; compact: string };
  labels: GuideLabels;
}) {
  return (
    <div id="gt-guide" className="gt-guide" hidden>
      <div className="gt-guide-sel" aria-hidden="true" />
      <div className="gt-guide-x">
        <div className="gt-guide-y">
          <button
            type="button"
            className="gt-guide-sprite"
            aria-label={labels.name}
            aria-expanded="false"
            aria-controls="gt-guide-bubble"
          >
            <PixelAvatarSprite />
            <i className="gt-guide-badge" aria-hidden="true" />
          </button>
          <span className="gt-guide-trail" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
      <div
        id="gt-guide-bubble"
        className="gt-guide-bubble"
        role="group"
        aria-labelledby="gt-guide-name"
        hidden
      >
        <p id="gt-guide-name">{labels.name}</p>
        <p className="gt-guide-text" />
        <div className="gt-guide-actions">
          <button type="button" data-act="next" className="gt-guide-next" hidden />
          <button type="button" data-act="end" className="gt-guide-end" hidden>
            {labels.endTour}
          </button>
          <button type="button" data-act="hide" className="gt-guide-hide">
            {labels.hide}
          </button>
          <button
            type="button"
            data-act="close"
            className="gt-guide-close"
            aria-label={labels.close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
      <p id="gt-guide-live" className="sr-only" role="status" aria-live="polite" />
      <GuideLoader greeting={greeting} labels={labels} />
    </div>
  );
}
