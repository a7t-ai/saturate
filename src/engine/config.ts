import type { Config, Fix } from "./types.ts";

export const DEFAULT_CONFIG: Config = {
  burst: 40,
  fanout: 12,
  mode: "parallel",
  batchSize: 3,
  poolSize: 4,
  serviceTicks: 1,
  queueCap: 50,
  waitSloTicks: 40,
  maxTicks: 2000,
  seed: 1,
};

export const BURST_MIN = 8;
export const BURST_MAX = 80;
export const SCALE_POOL_BY = 8;

export function issueBudget(config: Config): number {
  if (config.mode === "sequential") return 1;
  if (config.mode === "batched") return Math.max(1, config.batchSize);
  return Math.max(1, config.fanout);
}

export function applyFix(config: Config, fix: Fix): Config {
  if (fix === "serialize") return { ...config, mode: "sequential" };
  if (fix === "scale_pool") {
    return { ...config, poolSize: config.poolSize + SCALE_POOL_BY };
  }
  return { ...config, mode: "batched", batchSize: Math.max(3, config.batchSize) };
}

export function clampBurst(n: number): number {
  const v = Math.round(n);
  if (v < BURST_MIN) return BURST_MIN;
  if (v > BURST_MAX) return BURST_MAX;
  return v;
}
