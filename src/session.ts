import {
  CATALOG,
  cloneDesign,
  DEFAULT_DESIGN,
  EXAMPLE_CACHED,
  EXAMPLE_SERIALIZED,
  newId,
  type CatalogItem,
  type Design,
  type DesignNode,
  type Kind,
} from "./design.ts";
import { clampBurst, simulate, verdictLine } from "./engine/index.ts";
import { compile } from "./engine/compile.ts";
import type { BoardState, Config, Fix, Mode, SimResult, TickSnapshot } from "./engine/types.ts";

export interface Session {
  design: Design;
  config: Config;
  state: BoardState;
  result: SimResult | null;
  snap: TickSnapshot | null;
  playing: boolean;
  hint: string | null;
  selected: string | null;
}

const listeners = new Set<() => void>();

function fresh(design: Design): Session {
  const d = cloneDesign(design);
  return {
    design: d,
    config: compile(d),
    state: "idle",
    result: null,
    snap: null,
    playing: false,
    hint: null,
    selected: null,
  };
}

let session: Session = fresh(DEFAULT_DESIGN);

export function getSession(): Session {
  return session;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(next: Session): void {
  session = next;
  for (const fn of listeners) fn();
}

function patch(partial: Partial<Session>): void {
  emit({ ...session, ...partial });
}

function editable(): boolean {
  return session.state === "idle" || session.state === "survived";
}

function afterEdit(design: Design, extra: Partial<Session> = {}): Session {
  patch({
    design,
    config: compile(design),
    state: session.state === "survived" ? "idle" : session.state,
    result: session.state === "survived" ? null : session.result,
    hint: null,
    ...extra,
  });
  return session;
}

export function lineFor(s: Session): string {
  if (s.hint) return s.hint;
  if (s.state === "idle" || (s.state === "running" && !s.snap)) {
    const { burst, fanout, mode, poolSize } = s.config;
    return `${burst} requests, ${fanout} tools ${mode}, pool of ${poolSize}.`;
  }
  if (s.result) return verdictLine(s.config, s.result);
  return "";
}

export function setBurst(n: number): Session {
  if (!editable()) return session;
  const burst = clampBurst(n);
  const design: Design = {
    ...session.design,
    nodes: session.design.nodes.map((node) =>
      node.kind === "load" ? { ...node, config: { ...node.config, users: burst } } : node,
    ),
  };
  return afterEdit(design);
}

export function setAgent(input: { fanout?: number; mode?: Mode; batchSize?: number }): Session {
  if (!editable()) return session;
  const design: Design = {
    ...session.design,
    nodes: session.design.nodes.map((node) => {
      if (node.kind !== "agent") return node;
      const next = { ...node.config };
      if (input.fanout != null) next.fanout = Math.max(1, Math.min(24, Math.round(input.fanout)));
      if (input.mode) next.mode = input.mode;
      if (input.batchSize != null) next.batchSize = Math.max(1, Math.min(12, Math.round(input.batchSize)));
      return { ...node, config: next };
    }),
  };
  return afterEdit(design);
}

export function setPoolSize(n: number): Session {
  if (!editable()) return session;
  const poolSize = Math.max(1, Math.min(32, Math.round(n)));
  const design: Design = {
    ...session.design,
    nodes: session.design.nodes.map((node) =>
      node.kind === "pool" || node.kind === "tool" ? { ...node, config: { ...node.config, replicas: poolSize } } : node,
    ),
  };
  return afterEdit(design);
}

export function setNodeConfig(id: string, config: Record<string, number | string>): Session {
  if (!editable()) return session;
  const design: Design = {
    ...session.design,
    nodes: session.design.nodes.map((n) => (n.id === id ? { ...n, config: { ...n.config, ...config } } : n)),
  };
  return afterEdit(design);
}

export function moveNode(id: string, x: number, y: number): Session {
  const design: Design = {
    ...session.design,
    nodes: session.design.nodes.map((n) => (n.id === id ? { ...n, position: { x, y } } : n)),
  };
  patch({ design });
  return session;
}

export function addNode(kind: Kind, x: number, y: number): Session {
  if (!editable()) return session;
  const item = CATALOG.find((c) => c.kind === kind);
  if (!item) return session;
  const node: DesignNode = {
    id: newId("n"),
    kind,
    label: item.label,
    category: item.category,
    position: { x, y },
    config: defaultsFrom(kind),
  };
  const design: Design = { ...session.design, nodes: [...session.design.nodes, node] };
  return afterEdit(design, { selected: node.id });
}

function defaultsFrom(kind: Kind): Record<string, number | string> {
  if (kind === "load") return { users: 40 };
  if (kind === "agent") return { fanout: 12, mode: "parallel" };
  if (kind === "pool") return { replicas: 4 };
  if (kind === "tool") return { replicas: 1 };
  if (kind === "queue") return { cap: 80 };
  if (kind === "cache") return { hitRate: 40 };
  return {};
}

export function connect(from: string, to: string): Session {
  if (!editable()) return session;
  if (from === to) return session;
  if (session.design.edges.some((e) => e.from === from && e.to === to)) return session;
  const design: Design = {
    ...session.design,
    edges: [...session.design.edges, { id: newId("e"), from, to }],
  };
  return afterEdit(design);
}

export function disconnect(id: string): Session {
  if (!editable()) return session;
  const design: Design = { ...session.design, edges: session.design.edges.filter((e) => e.id !== id) };
  return afterEdit(design);
}

export function removeNode(id: string): Session {
  if (!editable()) return session;
  const design: Design = {
    ...session.design,
    nodes: session.design.nodes.filter((n) => n.id !== id),
    edges: session.design.edges.filter((e) => e.from !== id && e.to !== id),
  };
  return afterEdit(design, { selected: session.selected === id ? null : session.selected });
}

export function selectNode(id: string | null): Session {
  patch({ selected: id });
  return session;
}

export function loadExample(name: "saturate" | "serialized" | "cached"): Session {
  const src = name === "serialized" ? EXAMPLE_SERIALIZED : name === "cached" ? EXAMPLE_CACHED : DEFAULT_DESIGN;
  emit(fresh(src));
  return session;
}

export function run(): Session {
  if (session.state === "running" || session.playing) return session;
  const config = compile(session.design);
  const result = simulate(config);
  patch({
    config,
    result,
    snap: result.ticks[0] ?? null,
    playing: true,
    state: "running",
    hint: null,
  });
  return session;
}

export function reset(): Session {
  emit(fresh(DEFAULT_DESIGN));
  return session;
}

export function fix(kind: Fix): Session {
  if (session.state !== "collapsed" || session.playing) return session;
  let design = cloneDesign(session.design);
  if (kind === "serialize") {
    design = {
      ...design,
      nodes: design.nodes.map((n) => (n.kind === "agent" ? { ...n, config: { ...n.config, mode: "sequential" } } : n)),
    };
  } else if (kind === "scale_pool") {
    design = {
      ...design,
      nodes: design.nodes.map((n) =>
        n.kind === "pool" || n.kind === "tool"
          ? { ...n, config: { ...n.config, replicas: Number(n.config.replicas ?? 4) + 8 } }
          : n,
      ),
    };
  } else {
    design = {
      ...design,
      nodes: design.nodes.map((n) => (n.kind === "agent" ? { ...n, config: { ...n.config, mode: "batched", batchSize: 3 } } : n)),
    };
  }
  const hint =
    kind === "serialize" ? "Serialized. Run again." : kind === "scale_pool" ? "Pool widened. Run again." : "Batching. Run again.";
  patch({ design, config: compile(design), hint });
  return session;
}

export function setPlayback(partial: { snap?: TickSnapshot | null; playing?: boolean; state?: BoardState }): void {
  patch(partial);
}

export function boardJson(s: Session = session) {
  return {
    state: s.state,
    title: s.design.title,
    nodes: s.design.nodes.map((n) => ({ id: n.id, kind: n.kind, label: n.label })),
    edges: s.design.edges,
    config: {
      burst: s.config.burst,
      fanout: s.config.fanout,
      mode: s.config.mode,
      batchSize: s.config.batchSize,
      poolSize: s.config.poolSize,
      queueCap: s.config.queueCap,
    },
    metrics: s.snap
      ? {
          t: s.snap.t,
          queueDepth: s.snap.queueDepth,
          inService: s.snap.inService,
          utilization: s.snap.utilization,
          completed: s.snap.completed,
          remaining: s.snap.remaining,
          p99Wait: s.snap.p99Wait,
        }
      : null,
    verdict: s.result
      ? { outcome: s.result.verdict, reason: s.result.reason, p99Wait: s.result.p99Wait, bottleneck: s.result.bottleneck }
      : null,
    line: lineFor(s),
  };
}

export const catalog: CatalogItem[] = CATALOG;

let pendingKind: Kind | null = null;

export function beginPaletteDrag(kind: Kind): void {
  pendingKind = kind;
}

export function takePaletteDrag(): Kind | null {
  const k = pendingKind;
  pendingKind = null;
  return k;
}
