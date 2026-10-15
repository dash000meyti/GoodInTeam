import { Fragment } from "react";

/** Render `text` with `[start, end)` ranges wrapped in <mark>. */
export function Highlighted({ text, ranges }: { text: string; ranges: [number, number][] }) {
  if (!ranges.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([start, end], i) => {
    if (start < pos || end > text.length) return;
    if (start > pos) parts.push(<Fragment key={`t${i}`}>{text.slice(pos, start)}</Fragment>);
    parts.push(
      <mark key={`m${i}`} className="rounded bg-warning/30 px-0.5 text-inherit dark:bg-warning/25">
        {text.slice(start, end)}
      </mark>,
    );
    pos = end;
  });
  if (pos < text.length) parts.push(<Fragment key="rest">{text.slice(pos)}</Fragment>);
  return <>{parts}</>;
}
