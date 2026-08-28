import { useLayoutEffect, useRef, useState } from "react";
import type { Design, Kind } from "../design.ts";
import type { BoardState, Config, TickSnapshot } from "../engine/types.ts";
import {
  addNode,
  connect,
  moveNode,
  removeNode,
  selectNode,
  setNodeConfig,
  takePaletteDrag,
} from "../session.ts";
import {
  applyPan,
  applyZoom,
  fitView,
  gridPosition,
  gridSize,
  ORIGIN,
  type View,
  worldTransform,
} from "./canvas-state.ts";
import { bottleneckId, visualsFor } from "./health.ts";
import { ComponentNode, EdgeLayer } from "./nodes.tsx";

function worldAt(view: View, surface: DOMRect, clientX: number, clientY: number) {
  const sx = clientX - (surface.left + surface.width / 2);
  const sy = clientY - (surface.top + surface.height / 2);
  return { x: (sx - view.x) / view.zoom, y: (sy - view.y) / view.zoom };
}

export function EditorCanvas({
  design,
  config,
  snap,
  boardState,
  selected,
  canEdit,
}: {
  design: Design;
  config: Config;
  snap: TickSnapshot | null;
  boardState: BoardState;
  selected: string | null;
  canEdit: boolean;
}) {
  const [view, setView] = useState<View>(ORIGIN);
  const [dragging, setDragging] = useState(false);
  const [linking, setLinking] = useState<{ from: string; x: number; y: number } | null>(null);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const pan = useRef<{ x: number; y: number } | null>(null);

  const states = visualsFor(design, config, snap, boardState);
  const bottleneck = bottleneckId(design, boardState);

  function frameBoard() {
    const el = surfaceRef.current;
    if (!el) return;
    setView(fitView(design.nodes, el.getBoundingClientRect()));
  }

  useLayoutEffect(() => {
    frameBoard();
    // Reframe when an example board is loaded, not on every node drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.title]);

  function dropPalette(clientX: number, clientY: number) {
    const kind: Kind | null = takePaletteDrag();
    const el = surfaceRef.current;
    if (!kind || !el || !canEdit) return;
    const w = worldAt(view, el.getBoundingClientRect(), clientX, clientY);
    addNode(kind, w.x, w.y);
  }

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".comp-node, .canvas-controls")) return;
    pan.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (linking && surfaceRef.current) {
      const w = worldAt(view, surfaceRef.current.getBoundingClientRect(), e.clientX, e.clientY);
      setLinking({ ...linking, x: w.x, y: w.y });
      return;
    }
    const p = pan.current;
    if (!p) return;
    setView((v) => applyPan(v, e.clientX - p.x, e.clientY - p.y));
    pan.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent<HTMLElement>) {
    dropPalette(e.clientX, e.clientY);
    if (linking) {
      const target = (e.target as HTMLElement).closest("[data-node-id]");
      const to = target?.getAttribute("data-node-id");
      if (to) connect(linking.from, to);
      setLinking(null);
    }
    pan.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }
  function onWheel(e: React.WheelEvent<HTMLElement>) {
    e.preventDefault();
    const el = surfaceRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const focus = { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) };
    setView((v) => applyZoom(v, e.deltaY < 0 ? 1.08 : 1 / 1.08, focus));
  }

  function onLinkStart(id: string, e: React.PointerEvent) {
    const el = surfaceRef.current;
    if (!el) return;
    const w = worldAt(view, el.getBoundingClientRect(), e.clientX, e.clientY);
    setLinking({ from: id, x: w.x, y: w.y });
  }

  return (
    <section
      ref={surfaceRef}
      className={`app-canvas${dragging ? " dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div className="canvas-grid" style={{ backgroundSize: gridSize(view), backgroundPosition: gridPosition(view) }} />
      <div className="canvas-world" style={{ transform: worldTransform(view) }}>
        <EdgeLayer nodes={design.nodes} edges={design.edges} states={states} bottleneckId={bottleneck} linking={linking} />
        {design.nodes.map((node) => (
          <ComponentNode
            key={node.id}
            node={node}
            state={states[node.id]}
            isBottleneck={bottleneck === node.id}
            selected={selected === node.id}
            zoom={view.zoom}
            canEdit={canEdit}
            onMove={moveNode}
            onSelect={selectNode}
            onChange={setNodeConfig}
            onLinkStart={onLinkStart}
            onRemove={removeNode}
          />
        ))}
      </div>
      <div className="canvas-controls" onPointerDown={(e) => e.stopPropagation()}>
        <div className="zoom-cluster">
          <button type="button" className="zoom-btn" onClick={() => setView((v) => applyZoom(v, 0.8))} title="Zoom out" aria-label="Zoom out">
            −
          </button>
          <button
            type="button"
            className="zoom-level"
            onClick={() => setView((v) => applyZoom(v, 1 / v.zoom))}
            title="Zoom to 100%"
            aria-label="Zoom to 100%"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <button type="button" className="zoom-btn" onClick={() => setView((v) => applyZoom(v, 1.25))} title="Zoom in" aria-label="Zoom in">
            +
          </button>
          <span className="zoom-divider" />
          <button type="button" className="zoom-btn zoom-fit" onClick={frameBoard} title="Fit board in view" aria-label="Fit board in view">
            Fit
          </button>
        </div>
      </div>
    </section>
  );
}
