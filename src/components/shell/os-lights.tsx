/**
 * macOS-style traffic lights (spec §5.6): three octagon <span>s, decorative.
 * Idle grey by default; frame strips light them while the box is centred
 * (scroll-driven, frame.css) and an elevated Window shows its colours.
 */
export function OsLights({ size = 10, className }: { size?: 10 | 12; className?: string }) {
  return (
    <span
      className={className ? `os-lights ${className}` : "os-lights"}
      data-size={size}
      aria-hidden
    >
      <span />
      <span />
      <span />
    </span>
  );
}
