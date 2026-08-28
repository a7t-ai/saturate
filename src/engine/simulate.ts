import { issueBudget } from "./config.ts";
import { percentile } from "./percentile.ts";
import type { Config, SimResult, TickSnapshot } from "./types.ts";

interface Call {
  created: number;
  start: number | null;
  wait: number | null;
}

interface Worker {
  remaining: number;
  wait: number;
}

function p99Of(waits: number[]): number | null {
  if (waits.length === 0) return null;
  const sorted = waits.slice().sort((a, b) => a - b);
  return percentile(sorted, 99);
}

/**
 * Discrete tick sim. Same config => same ticks.
 *
 * Parallel issues `fanout` tools per tick (a salvo). Sequential issues 1.
 * Batched issues `batchSize`. The pool serves `poolSize` calls, each taking
 * `serviceTicks`. Queue cap is the fast collapse; wait SLO is the slow one.
 */
export function simulate(config: Config): SimResult {
  const total = config.burst * config.fanout;
  const budget = issueBudget(config);
  const waits: number[] = [];
  const ticks: TickSnapshot[] = [];

  let emitted = 0;
  let completed = 0;
  const queue: Call[] = [];
  const workers: Worker[] = [];
  let reason = "";
  let bottleneck: SimResult["bottleneck"] = "pool";
  let end: TickSnapshot["state"] = "running";

  for (let t = 1; t <= config.maxTicks; t++) {
    let finishedThisTick = 0;
    for (const w of workers) w.remaining -= 1;
    const still: Worker[] = [];
    for (const w of workers) {
      if (w.remaining > 0) {
        still.push(w);
      } else {
        waits.push(w.wait);
        completed += 1;
        finishedThisTick += 1;
      }
    }
    workers.length = 0;
    workers.push(...still);

    let issuedThisTick = 0;
    const toIssue = Math.min(budget, total - emitted);
    for (let i = 0; i < toIssue; i++) {
      queue.push({ created: t, start: null, wait: null });
      emitted += 1;
      issuedThisTick += 1;
    }

    while (workers.length < config.poolSize && queue.length > 0) {
      const call = queue.shift()!;
      const wait = t - call.created;
      call.start = t;
      call.wait = wait;
      workers.push({ remaining: config.serviceTicks, wait });
    }

    const remaining = total - emitted;
    const p99Wait = p99Of(waits);
    const maxWait = waits.length === 0 ? 0 : Math.max(...waits);
    const utilization = config.poolSize === 0 ? 0 : workers.length / config.poolSize;
    const drained = remaining === 0 && queue.length === 0 && workers.length === 0;

    let state: TickSnapshot["state"] = "running";
    let tickReason: string | null = null;

    if (queue.length > config.queueCap) {
      state = "collapsed";
      tickReason = `queue ${queue.length} exceeded cap ${config.queueCap}`;
      bottleneck = "pool";
    } else if (p99Wait != null && p99Wait > config.waitSloTicks) {
      state = "collapsed";
      tickReason = `p99 wait ${p99Wait} exceeded SLO ${config.waitSloTicks}`;
      bottleneck = "wait";
    } else if (drained) {
      state = "survived";
      tickReason = "drained";
    } else if (t === config.maxTicks) {
      state = "collapsed";
      tickReason = `still ${remaining + queue.length + workers.length} in flight at max ticks`;
      bottleneck = "timeout";
    }

    const snap: TickSnapshot = {
      t,
      queueDepth: queue.length,
      inService: workers.length,
      utilization,
      completed,
      emitted,
      remaining,
      issuedThisTick,
      finishedThisTick,
      p99Wait,
      maxWait,
      state,
      reason: tickReason,
    };
    ticks.push(snap);

    if (state !== "running") {
      end = state;
      reason = tickReason ?? state;
      break;
    }
  }

  const last = ticks[ticks.length - 1];
  if (!last) {
    return {
      ticks: [],
      verdict: "collapsed",
      reason: "no ticks",
      p99Wait: null,
      bottleneck: "timeout",
    };
  }

  return {
    ticks,
    verdict: end === "survived" ? "survived" : "collapsed",
    reason,
    p99Wait: last.p99Wait,
    bottleneck: end === "survived" ? "pool" : bottleneck,
  };
}

export function verdictLine(config: Config, result: SimResult): string {
  const mode =
    config.mode === "batched" ? `batches of ${config.batchSize}` : config.mode;
  if (result.verdict === "collapsed") {
    const last = result.ticks[result.ticks.length - 1];
    const q = last?.queueDepth ?? 0;
    return `Collapsed under ${config.burst} requests × ${config.fanout} tools (${mode}), pool of ${config.poolSize}. Queue ${q}, cap ${config.queueCap}.`;
  }
  const p99 = result.p99Wait == null ? "n/a" : `${result.p99Wait} ticks`;
  return `Survived ${config.burst} requests × ${config.fanout} tools (${mode}), pool of ${config.poolSize}. p99 wait ${p99}.`;
}
