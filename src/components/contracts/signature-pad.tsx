"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EraserIcon, Undo2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
  t: number;
  /** Line width at this point (velocity based). */
  w: number;
}

const INK = "#1c252e";
const MIN_W = 1.2;
const MAX_W = 3.4;
/** Exported PNG: max width in px and max data-URL length (~150 KB). */
const EXPORT_MAX_W = 640;
const EXPORT_MAX_LEN = 200_000;

function widthFor(prev: Point | undefined, x: number, y: number, t: number) {
  if (!prev) return (MIN_W + MAX_W) / 2;
  const dt = Math.max(1, t - prev.t);
  const v = Math.hypot(x - prev.x, y - prev.y) / dt; // px per ms
  const target = Math.max(MIN_W, Math.min(MAX_W, MAX_W - v * 1.6));
  return prev.w * 0.6 + target * 0.4; // smooth width changes
}

/** Draw one stroke as quadratic curves through segment midpoints (smooth ink). */
function drawStroke(ctx: CanvasRenderingContext2D, pts: Point[], from = 0) {
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (pts.length === 1) {
    const p = pts[0]!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.w / 2 + 0.3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = Math.max(1, from); i < pts.length; i++) {
    const p0 = pts[i - 2] ?? pts[i - 1]!;
    const p1 = pts[i - 1]!;
    const p2 = pts[i]!;
    const start = i === 1 ? p1 : { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const end = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    ctx.beginPath();
    ctx.lineWidth = (p1.w + p2.w) / 2;
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(p1.x, p1.y, end.x, end.y);
    ctx.stroke();
  }
}

/** Crop to the ink, scale down and export a transparent PNG data URL (≤ ~150 KB). */
function exportPng(strokes: Point[][]): string | null {
  const all = strokes.flat();
  if (!all.length) return null;
  const pad = MAX_W * 2;
  const minX = Math.min(...all.map((p) => p.x)) - pad;
  const minY = Math.min(...all.map((p) => p.y)) - pad;
  const maxX = Math.max(...all.map((p) => p.x)) + pad;
  const maxY = Math.max(...all.map((p) => p.y)) + pad;
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  for (let scale = Math.min(2, EXPORT_MAX_W / w); scale > 0.2; scale *= 0.75) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.scale(scale, scale);
    ctx.translate(-minX, -minY);
    for (const s of strokes) drawStroke(ctx, s);
    const url = c.toDataURL("image/png");
    if (url.length <= EXPORT_MAX_LEN) return url;
  }
  return null;
}

/**
 * Hand-drawn signature input: pointer events (mouse, pen, touch), smooth
 * velocity-weighted strokes, DPR-aware canvas, undo/clear. Always draws dark
 * ink on a light "paper" surface so the exported PNG prints correctly.
 * Emits a cropped PNG data URL (or null when empty) after each stroke.
 */
export function SignaturePad({
  onChange,
  label,
  hint,
  clearLabel,
  undoLabel,
  placeholder,
  disabled,
  className,
  height = 180,
  invalid,
}: {
  onChange: (dataUrl: string | null) => void;
  label: string;
  hint?: string;
  clearLabel: string;
  undoLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  height?: number;
  invalid?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef<{ id: number; pts: Point[] } | null>(null);
  const [count, setCount] = useState(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes.current) drawStroke(ctx, s);
  }, []);

  // Keep the backing store in sync with CSS size × devicePixelRatio.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        redraw();
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  const emit = useCallback(() => {
    setCount(strokes.current.length);
    onChange(strokes.current.length ? exportPng(strokes.current) : null);
  }, [onChange]);

  const pointFrom = (e: { clientX: number; clientY: number; timeStamp: number }, prev?: Point) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y, t: e.timeStamp, w: widthFor(prev, x, y, e.timeStamp) };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pts = [pointFrom(e)];
    drawing.current = { id: e.pointerId, pts };
    strokes.current.push(pts);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawStroke(ctx, pts);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current;
    if (!d || d.id !== e.pointerId) return;
    e.preventDefault();
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const from = d.pts.length;
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const prev = d.pts[d.pts.length - 1];
      const p = pointFrom(ev, prev);
      if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 0.8) continue;
      d.pts.push(p);
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && d.pts.length > from) drawStroke(ctx, d.pts, from);
  };

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current;
    if (!d || d.id !== e.pointerId) return;
    drawing.current = null;
    emit();
  };

  const clear = () => {
    strokes.current = [];
    redraw();
    emit();
  };

  const undo = () => {
    strokes.current.pop();
    redraw();
    emit();
  };

  const empty = count === 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed bg-white transition-colors",
          invalid ? "border-destructive/60" : "border-grey-300 focus-within:border-primary",
          disabled && "opacity-60",
        )}
        style={{ height }}
      >
        {/* Sign-here guide line (purely decorative). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 bottom-10 flex items-end gap-2"
        >
          <span className="text-lg leading-none font-bold text-grey-400">✕</span>
          <span className="mb-1 h-px flex-1 bg-grey-300" />
        </div>
        {empty && placeholder && (
          <p
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm font-medium text-grey-500"
          >
            {placeholder}
          </p>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          className="absolute inset-0 size-full cursor-crosshair touch-none select-none"
          style={{ overscrollBehavior: "contain" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        />
        <div className="absolute end-2 top-2 flex gap-1">
          {undoLabel && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-grey-600 hover:bg-grey-200 hover:text-grey-800"
              onClick={undo}
              disabled={empty || disabled}
              aria-label={undoLabel}
              title={undoLabel}
            >
              <Undo2Icon />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-grey-600 hover:bg-grey-200 hover:text-grey-800"
            onClick={clear}
            disabled={empty || disabled}
          >
            <EraserIcon /> {clearLabel}
          </Button>
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
