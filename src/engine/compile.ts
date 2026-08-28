import type { Design } from "../design.ts";
import { BURST_MAX, BURST_MIN, DEFAULT_CONFIG } from "./config.ts";
import type { Config, Mode } from "./types.ts";

function num(v: number | string | undefined, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function compile(design: Design): Config {
  const loads = design.nodes.filter((n) => n.kind === "load");
  const agents = design.nodes.filter((n) => n.kind === "agent");
  const pools = design.nodes.filter((n) => n.kind === "pool" || n.kind === "tool");
  const queues = design.nodes.filter((n) => n.kind === "queue");
  const caches = design.nodes.filter((n) => n.kind === "cache");
  const coords = design.nodes.filter((n) => n.kind === "coordinator");

  let burst = loads.reduce((s, n) => s + num(n.config.users, 40), 0);
  if (burst <= 0) burst = DEFAULT_CONFIG.burst;
  burst = Math.min(BURST_MAX, Math.max(BURST_MIN, burst));

  let fanout = agents.reduce((s, n) => s + num(n.config.fanout, 12), 0);
  fanout += design.nodes.filter((n) => n.kind === "tool").length;
  if (fanout <= 0) fanout = DEFAULT_CONFIG.fanout;

  const hit = caches.reduce((s, n) => s + num(n.config.hitRate, 0), 0) / Math.max(1, caches.length * 100);
  if (caches.length) fanout = Math.max(1, Math.round(fanout * (1 - Math.min(0.9, hit))));

  let mode: Mode = "parallel";
  if (coords.length) mode = "sequential";
  else {
    const m = agents[0]?.config.mode;
    if (m === "sequential" || m === "batched" || m === "parallel") mode = m;
  }

  const poolSize = Math.max(
    1,
    pools.reduce((s, n) => s + num(n.config.replicas, n.kind === "tool" ? 1 : 4), 0) || DEFAULT_CONFIG.poolSize,
  );

  const queueCap = Math.max(
    DEFAULT_CONFIG.queueCap,
    queues.reduce((s, n) => Math.max(s, num(n.config.cap, 80)), 0),
  );

  const batchSize = Math.max(1, num(agents[0]?.config.batchSize, DEFAULT_CONFIG.batchSize));

  return { ...DEFAULT_CONFIG, burst, fanout, mode, poolSize, queueCap, batchSize };
}


