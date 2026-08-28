export type Mode = "parallel" | "sequential" | "batched";

export type BoardState = "idle" | "running" | "collapsed" | "survived";

export type Fix = "serialize" | "scale_pool" | "batch";

export interface Config {
  burst: number;
  fanout: number;
  mode: Mode;
  batchSize: number;
  poolSize: number;
  serviceTicks: number;
  queueCap: number;
  waitSloTicks: number;
  maxTicks: number;
  seed: number;
}

export interface TickSnapshot {
  t: number;
  queueDepth: number;
  inService: number;
  utilization: number;
  completed: number;
  emitted: number;
  remaining: number;
  issuedThisTick: number;
  finishedThisTick: number;
  p99Wait: number | null;
  maxWait: number;
  state: "running" | "collapsed" | "survived";
  reason: string | null;
}

export interface SimResult {
  ticks: TickSnapshot[];
  verdict: "collapsed" | "survived";
  reason: string;
  p99Wait: number | null;
  bottleneck: "pool" | "wait" | "timeout";
}
