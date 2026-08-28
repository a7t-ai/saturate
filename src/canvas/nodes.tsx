import { useRef, useState } from "react";
import type { DesignEdge, DesignNode, Kind } from "../design.ts";
import { bezierPath, bezierPoint, edgeFlow, tagWidth, type Pt } from "./edge-geometry.ts";
import type { NodeVisual } from "./health.ts";

function tagFor(kind: Kind): string {
  if (kind === "cache") return "CACHE";
  if (kind === "queue") return "Q";
  if (kind === "coordinator") return "LOOP";
  return "REQ";
}

export function EdgeLayer({
  nodes,
  edges,
  states,
  bottleneckId,
  linking,
}: {
  nodes: DesignNode[];
  edges: DesignEdge[];
  states: Record<string, NodeVisual>;
  bottleneckId: string | null;
  linking: { from: string; x: number; y: number } | null;
}) {
  const at = new Map(nodes.map((n) => [n.id, n.position]));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg className="canvas-edges" aria-hidden="true">
      {edges.map((e) => {
        const a = at.get(e.from);
        const b = at.get(e.to);
        if (!a || !b) return null;
        const dst = states[e.to];
        const health = dst?.health ?? "idle";
        const flowing = (dst?.incomingRps ?? 0) > 0;
        const overloaded = health === "overload";
        const onBottleneck = bottleneckId === e.to;
        const mid = bezierPoint(a, b, 0.5);
        const flow = flowing ? edgeFlow(Math.max(1, dst.incomingRps), dst.utilization) : null;
        const tag = overloaded ? "ERROR" : tagFor(byId.get(e.to)?.kind ?? "pool");
        const w = tagWidth(tag);
        return (
          <g key={e.id}>
            <path className={`edge-line health-${health}${onBottleneck ? " bottleneck-path" : ""}`} d={bezierPath(a, b)} />
            {flow ? <path className={`edge-flow health-${health}`} d={bezierPath(a, b)} style={flow} /> : null}
            <g className="edge-tag" transform={`translate(${mid.x}, ${mid.y})`}>
              <rect className={overloaded ? "edge-error-bg" : "edge-tag-bg"} x={-w / 2} y={-9} width={w} height={18} rx="5" />
              <text className={overloaded ? "edge-error-text" : "edge-tag-text"} textAnchor="middle" y="4">
                {tag}
              </text>
            </g>
          </g>
        );
      })}
      {linking
        ? (() => {
            const a = at.get(linking.from);
            if (!a) return null;
            const b = { x: linking.x, y: linking.y };
            return <path className="edge-line linking" d={bezierPath(a, b)} />;
          })()
        : null}
    </svg>
  );
}

export function ComponentNode({
  node,
  state,
  isBottleneck,
  selected,
  zoom,
  canEdit,
  onMove,
  onSelect,
  onChange,
  onLinkStart,
  onRemove,
}: {
  node: DesignNode;
  state?: NodeVisual;
  isBottleneck: boolean;
  selected: boolean;
  zoom: number;
  canEdit: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onChange: (id: string, config: Record<string, number | string>) => void;
  onLinkStart: (id: string, e: React.PointerEvent) => void;
  onRemove: (id: string) => void;
}) {
  const [drag, setDrag] = useState<Pt | null>(null);
  const origin = useRef<{ px: number; py: number; nx: number; ny: number } | null>(null);
  const pos = drag ?? node.position;
  const health = state?.health ?? "idle";
  const showBottleneck = isBottleneck && health === "overload";
  const reps = Number(node.config.replicas ?? (node.kind === "tool" ? 1 : 4));
  const scaled = node.kind === "pool" || node.kind === "tool";

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    origin.current = { px: e.clientX, py: e.clientY, nx: node.position.x, ny: node.position.y };
    setDrag(node.position);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    const f = origin.current;
    if (!f) return;
    setDrag({ x: f.nx + (e.clientX - f.px) / zoom, y: f.ny + (e.clientY - f.py) / zoom });
  }
  function onPointerUp(e: React.PointerEvent<HTMLElement>) {
    const f = origin.current;
    if (!f) return;
    const next = { x: f.nx + (e.clientX - f.px) / zoom, y: f.ny + (e.clientY - f.py) / zoom };
    origin.current = null;
    setDrag(null);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (next.x !== f.nx || next.y !== f.ny) onMove(node.id, next.x, next.y);
    else onSelect(node.id);
  }

  return (
    <article
      data-node-id={node.id}
      className={`comp-node health-${health} cat-${node.category}${showBottleneck ? " bottleneck" : ""}${drag ? " dragging" : ""}${selected ? " selected" : ""}`}
      style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="comp-node-head">
        <span className="comp-node-cat" aria-hidden="true" />
        <span className="comp-node-label">{node.label}</span>
        {canEdit ? (
          <button
            type="button"
            className="comp-node-menu-btn"
            aria-label={`Remove ${node.label}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(node.id)}
          >
            ×
          </button>
        ) : null}
      </div>

      {scaled ? (
        <div className="comp-node-reps" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" className="rep-btn" disabled={!canEdit || reps <= 1} onClick={() => onChange(node.id, { replicas: reps - 1 })}>
            −
          </button>
          <span className="rep-count">{reps} rep</span>
          <button type="button" className="rep-btn" disabled={!canEdit} onClick={() => onChange(node.id, { replicas: reps + 1 })}>
            +
          </button>
        </div>
      ) : null}

      <div className="comp-node-body open">
        <div className="comp-node-body-inner">
          {node.kind === "load" ? (
            <label className="config-field" onPointerDown={(e) => e.stopPropagation()}>
              <span>Users</span>
              <input type="number" min={8} max={80} value={Number(node.config.users ?? 40)} disabled={!canEdit} onChange={(e) => onChange(node.id, { users: Number(e.target.value) })} />
            </label>
          ) : null}
          {node.kind === "agent" ? (
            <>
              <label className="config-field" onPointerDown={(e) => e.stopPropagation()}>
                <span>Fan-out</span>
                <input type="number" min={1} max={24} value={Number(node.config.fanout ?? 12)} disabled={!canEdit} onChange={(e) => onChange(node.id, { fanout: Number(e.target.value) })} />
              </label>
              <label className="config-field" onPointerDown={(e) => e.stopPropagation()}>
                <span>Mode</span>
                <select value={String(node.config.mode ?? "parallel")} disabled={!canEdit} onChange={(e) => onChange(node.id, { mode: e.target.value })}>
                  <option value="parallel">parallel</option>
                  <option value="sequential">sequential</option>
                  <option value="batched">batched</option>
                </select>
              </label>
            </>
          ) : null}
          {node.kind === "queue" ? (
            <label className="config-field" onPointerDown={(e) => e.stopPropagation()}>
              <span>Cap</span>
              <input type="number" min={10} max={400} value={Number(node.config.cap ?? 80)} disabled={!canEdit} onChange={(e) => onChange(node.id, { cap: Number(e.target.value) })} />
            </label>
          ) : null}
          {node.kind === "cache" ? (
            <label className="config-field" onPointerDown={(e) => e.stopPropagation()}>
              <span>Hit rate %</span>
              <input type="number" min={0} max={90} value={Number(node.config.hitRate ?? 40)} disabled={!canEdit} onChange={(e) => onChange(node.id, { hitRate: Number(e.target.value) })} />
            </label>
          ) : null}
          {node.kind === "coordinator" ? (
            <p className="config-note">Serializes the event loop.</p>
          ) : null}
        </div>
      </div>

      {state && state.health !== "idle" ? (
        <div className="comp-node-health">
          <div className="health-bar">
            <span className="health-fill" style={{ width: `${Math.min(100, state.utilization * 100)}%` }} />
          </div>
          <div className="health-meta">
            <span className="health-util">{Math.round(state.utilization * 100)}%</span>
            <span>{Math.round(state.latencyMs)} ms</span>
          </div>
          {showBottleneck ? <span className="health-bottleneck">bottleneck</span> : null}
        </div>
      ) : null}

      {canEdit ? (
        <button
          type="button"
          className="comp-node-handle"
          aria-label={`Connect from ${node.label}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            onLinkStart(node.id, e);
          }}
        />
      ) : (
        <span className="comp-node-handle" aria-hidden="true" />
      )}
    </article>
  );
}
