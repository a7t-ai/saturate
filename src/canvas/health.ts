import type { Design, DesignNode } from "../design.ts";
import type { BoardState, Config, TickSnapshot } from "../engine/types.ts";

export type Health = "idle" | "healthy" | "stressed" | "overload";

export interface NodeVisual {
  health: Health;
  utilization: number;
  latencyMs: number;
  incomingRps: number;
}

export function visualsFor(
  design: Design,
  config: Config,
  snap: TickSnapshot | null,
  state: BoardState,
): Record<string, NodeVisual> {
  const out: Record<string, NodeVisual> = {};
  for (const n of design.nodes) out[n.id] = visualFor(n, config, snap, state);
  return out;
}

function visualFor(node: DesignNode, config: Config, snap: TickSnapshot | null, state: BoardState): NodeVisual {
  if (!snap || snap.t === 0) return { health: "idle", utilization: 0, latencyMs: 0, incomingRps: 0 };
  if (node.kind === "load") {
    const rps = snap.issuedThisTick > 0 ? config.burst : 0;
    return { health: rps > 0 ? "healthy" : "idle", utilization: rps > 0 ? 0.35 : 0, latencyMs: 0, incomingRps: rps };
  }
  if (node.kind === "agent" || node.kind === "coordinator") {
    const util = Math.min(1, snap.issuedThisTick / Math.max(1, config.fanout));
    return { health: band(util, false), utilization: util, latencyMs: 4, incomingRps: snap.issuedThisTick };
  }
  if (node.kind === "cache") {
    const util = Math.min(1, snap.issuedThisTick / Math.max(1, config.fanout));
    return { health: "healthy", utilization: util * 0.4, latencyMs: 1, incomingRps: snap.issuedThisTick };
  }
  if (node.kind === "queue") {
    const q = snap.queueDepth / Math.max(1, config.queueCap);
    return { health: band(q, q > 0.8), utilization: Math.min(1, q), latencyMs: (snap.p99Wait ?? 0) * 8, incomingRps: snap.queueDepth };
  }
  const util = snap.utilization;
  const overload = state === "collapsed" || snap.queueDepth > config.queueCap * 0.8;
  return {
    health: band(util, overload),
    utilization: util,
    latencyMs: (snap.p99Wait ?? 0) * 16,
    incomingRps: snap.inService + snap.queueDepth,
  };
}

function band(util: number, overload: boolean): Health {
  if (overload || util >= 0.92) return "overload";
  if (util >= 0.55) return "stressed";
  if (util > 0) return "healthy";
  return "idle";
}

export function bottleneckId(design: Design, state: BoardState): string | null {
  if (state !== "collapsed") return null;
  return design.nodes.find((n) => n.kind === "pool" || n.kind === "tool" || n.kind === "queue")?.id ?? null;
}
