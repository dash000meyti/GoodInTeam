import { PixelAvatarSprite } from "@/components/brand/pixel-art";
import type { GuideLabels } from "./guide-engine";
import { GuideLoader } from "./guide-loader";

/**
 * GoodInBot's static DOM (spec §10.2), server-rendered inside `.os-desktop`
 * after the footer: an absolute, clipped, pointer-transparent layer holding
 * the selection box, the bot's slot (it clips the bot at the anchor line, so
 * the bot emerges from behind a box edge, the menu bar or the dock), the
 * bubble and the polite live region. The sprite has no `cell` prop:
 * guide.css sizes it (3px desktop, 2px compact). The bubble's text is two
 * spans, typed and not yet typed (visually hidden, still read), so the full
 * line is laid out from the start. Lines are never rendered here: the engine
 * reads `data-guide-say` from the page.
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
      <div className="gt-guide-slot">
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
      </div>
      <div
        id="gt-guide-bubble"
        className="gt-guide-bubble"
        role="group"
        aria-labelledby="gt-guide-name"
        hidden
      >
        <p id="gt-guide-name">
          <span lang="en">{labels.name}</span>
        </p>
        <p className="gt-guide-text">
          <span className="gt-guide-typed" />
          <span className="gt-guide-rest" />
        </p>
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
