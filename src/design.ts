export type Kind = "load" | "agent" | "pool" | "queue" | "coordinator" | "cache" | "tool";
export type Category = "traffic" | "serving" | "backend" | "resilience";

export interface DesignNode {
  id: string;
  kind: Kind;
  label: string;
  category: Category;
  position: { x: number; y: number };
  config: Record<string, number | string>;
}

export interface DesignEdge {
  id: string;
  from: string;
  to: string;
}

export interface Design {
  title: string;
  nodes: DesignNode[];
  edges: DesignEdge[];
}

export interface CatalogItem {
  kind: Kind;
  label: string;
  category: Category;
  group: string;
  blurb: string;
}

export const CATALOG: CatalogItem[] = [
  { kind: "load", label: "Burst", category: "traffic", group: "Traffic", blurb: "Concurrent users hitting the agent." },
  { kind: "agent", label: "Agent", category: "serving", group: "Agents", blurb: "Fans one request into many tool calls." },
  { kind: "coordinator", label: "Coordinator", category: "serving", group: "Agents", blurb: "Serializes the event loop. One start at a time." },
  { kind: "tool", label: "Tool", category: "backend", group: "Work", blurb: "A single downstream tool endpoint." },
  { kind: "pool", label: "Worker pool", category: "backend", group: "Work", blurb: "Bounded concurrency. Queues when full." },
  { kind: "queue", label: "Queue", category: "resilience", group: "Resilience", blurb: "Raises how much can wait before collapse." },
  { kind: "cache", label: "Cache", category: "resilience", group: "Resilience", blurb: "Absorbs a fraction of the fan-out." },
];

export function defaultsFor(kind: Kind): Record<string, number | string> {
  if (kind === "load") return { users: 40 };
  if (kind === "agent") return { fanout: 12, mode: "parallel" };
  if (kind === "pool" || kind === "tool") return { replicas: kind === "tool" ? 1 : 4 };
  if (kind === "queue") return { cap: 80 };
  if (kind === "cache") return { hitRate: 40 };
  return {};
}

export const DEFAULT_DESIGN: Design = {
  title: "Saturate",
  nodes: [
    { id: "n-burst", kind: "load", label: "Burst", category: "traffic", position: { x: -20, y: 0 }, config: { users: 40 } },
    { id: "n-agent", kind: "agent", label: "Agent", category: "serving", position: { x: 230, y: 0 }, config: { fanout: 12, mode: "parallel" } },
    { id: "n-pool", kind: "pool", label: "Pool", category: "backend", position: { x: 480, y: 0 }, config: { replicas: 4 } },
  ],
  edges: [
    { id: "e-ba", from: "n-burst", to: "n-agent" },
    { id: "e-ap", from: "n-agent", to: "n-pool" },
  ],
};

export const EXAMPLE_SERIALIZED: Design = {
  title: "Serialized loop",
  nodes: [
    { id: "n-burst", kind: "load", label: "Burst", category: "traffic", position: { x: -40, y: 0 }, config: { users: 40 } },
    { id: "n-agent", kind: "agent", label: "Agent", category: "serving", position: { x: 200, y: -80 }, config: { fanout: 12, mode: "sequential" } },
    { id: "n-coord", kind: "coordinator", label: "Coordinator", category: "serving", position: { x: 200, y: 90 }, config: {} },
    { id: "n-pool", kind: "pool", label: "Pool", category: "backend", position: { x: 480, y: 0 }, config: { replicas: 4 } },
  ],
  edges: [
    { id: "e1", from: "n-burst", to: "n-agent" },
    { id: "e2", from: "n-agent", to: "n-coord" },
    { id: "e3", from: "n-coord", to: "n-pool" },
  ],
};

export const EXAMPLE_CACHED: Design = {
  title: "Cached tools",
  nodes: [
    { id: "n-burst", kind: "load", label: "Burst", category: "traffic", position: { x: -40, y: 0 }, config: { users: 40 } },
    { id: "n-agent", kind: "agent", label: "Agent", category: "serving", position: { x: 200, y: 0 }, config: { fanout: 12, mode: "parallel" } },
    { id: "n-cache", kind: "cache", label: "Cache", category: "resilience", position: { x: 360, y: -90 }, config: { hitRate: 50 } },
    { id: "n-pool", kind: "pool", label: "Pool", category: "backend", position: { x: 520, y: 40 }, config: { replicas: 4 } },
  ],
  edges: [
    { id: "e1", from: "n-burst", to: "n-agent" },
    { id: "e2", from: "n-agent", to: "n-cache" },
    { id: "e3", from: "n-cache", to: "n-pool" },
  ],
};

export function cloneDesign(d: Design): Design {
  return {
    title: d.title,
    nodes: d.nodes.map((n) => ({ ...n, position: { ...n.position }, config: { ...n.config } })),
    edges: d.edges.map((e) => ({ ...e })),
  };
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function catalogGroups(): { group: string; items: CatalogItem[] }[] {
  const order = ["Traffic", "Agents", "Work", "Resilience"];
  return order
    .map((group) => ({ group, items: CATALOG.filter((c) => c.group === group) }))
    .filter((g) => g.items.length > 0);
}
