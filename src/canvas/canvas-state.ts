export interface View {
  x: number;
  y: number;
  zoom: number;
}

export const ORIGIN: View = { x: 0, y: 0, zoom: 1 };
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 3;

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function applyPan(v: View, dx: number, dy: number): View {
  return { x: v.x + dx, y: v.y + dy, zoom: v.zoom };
}

export function applyZoom(v: View, factor: number, focus: { x: number; y: number } = { x: 0, y: 0 }): View {
  const zoom = clampZoom(v.zoom * factor);
  if (zoom === v.zoom) return v;
  const k = 1 - zoom / v.zoom;
  return { x: v.x + k * (focus.x - v.x), y: v.y + k * (focus.y - v.y), zoom };
}

/** Half-size of a typical component card, in world pixels. */
export const NODE_HALF = { w: 120, h: 80 };

/** Overlay chrome the camera should leave clear when fitting. */
export const FIT_CHROME = {
  left: 264 + 14,
  right: 252 + 14,
  top: 52,
  bottom: 14 + 40,
  pad: 24,
};

export function fitView(
  nodes: { position: { x: number; y: number } }[],
  viewport: { width: number; height: number },
): View {
  if (!nodes.length) return ORIGIN;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x - NODE_HALF.w);
    maxX = Math.max(maxX, n.position.x + NODE_HALF.w);
    minY = Math.min(minY, n.position.y - NODE_HALF.h);
    maxY = Math.max(maxY, n.position.y + NODE_HALF.h);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const usableW = Math.max(120, viewport.width - FIT_CHROME.left - FIT_CHROME.right);
  const usableH = Math.max(120, viewport.height - FIT_CHROME.top - FIT_CHROME.bottom);
  const spanW = Math.max(1, maxX - minX + FIT_CHROME.pad * 2);
  const spanH = Math.max(1, maxY - minY + FIT_CHROME.pad * 2);
  const zoom = clampZoom(Math.min(usableW / spanW, usableH / spanH, 1));
  const usableCx = FIT_CHROME.left + usableW / 2 - viewport.width / 2;
  const usableCy = FIT_CHROME.top + usableH / 2 - viewport.height / 2;
  return { x: usableCx - cx * zoom, y: usableCy - cy * zoom, zoom };
}

export function worldTransform(v: View): string {
  return `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
}

export function gridSize(v: View): string {
  const c = 150 * v.zoom;
  const f = 30 * v.zoom;
  return `${c}px ${c}px, ${c}px ${c}px, ${f}px ${f}px, ${f}px ${f}px`;
}

function axis(px: number): string {
  return px < 0 ? `calc(50% - ${-px}px)` : `calc(50% + ${px}px)`;
}

export function gridPosition(v: View): string {
  return `${axis(v.x)} ${axis(v.y)}`;
}
