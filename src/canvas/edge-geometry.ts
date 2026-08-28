import type { CSSProperties } from "react";

export type Pt = { x: number; y: number };

export function tagWidth(label: string): number {
  return Math.max(28, label.length * 7 + 14);
}

export function edgeCtrl(a: Pt, b: Pt): number {
  return Math.max(40, Math.abs(b.x - a.x) * 0.5);
}

export function bezierPath(a: Pt, b: Pt): string {
  const c = edgeCtrl(a, b);
  return `M ${a.x} ${a.y} C ${a.x + c} ${a.y}, ${b.x - c} ${b.y}, ${b.x} ${b.y}`;
}

export function bezierPoint(a: Pt, b: Pt, t: number): Pt {
  const c = edgeCtrl(a, b);
  const p1 = { x: a.x + c, y: a.y };
  const p2 = { x: b.x - c, y: b.y };
  const mt = 1 - t;
  return {
    x: mt * mt * mt * a.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * b.x,
    y: mt * mt * mt * a.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * b.y,
  };
}

export const DOT_LEN = 2;

export function edgeFlow(rps: number, utilization: number): CSSProperties | null {
  if (rps <= 0) return null;
  const spacing = Math.max(12, Math.min(56, 320 / rps));
  const period = DOT_LEN + spacing;
  const speed = 150 + Math.min(utilization, 1.5) * 120;
  const duration = Math.max(0.4, period / speed);
  return {
    strokeDasharray: `${DOT_LEN} ${spacing}`,
    animationDuration: `${duration}s`,
    ["--travel" as string]: `${-period}`,
  };
}
