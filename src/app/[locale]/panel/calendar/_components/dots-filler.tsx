/**
 * The rest of a cell when its neighbour is taller: desktop dots texture, like
 * the site's filler cells (decoration only). Put it last in a `flex-col` cell.
 * The top hairline is an inset shadow, so a zero-height filler draws nothing
 * (no double line under the content).
 */
export function DotsFiller() {
  return (
    <div
      aria-hidden
      className="min-h-0 flex-1 bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px] shadow-[inset_0_1px_0_var(--frame-line)]"
    />
  );
}
