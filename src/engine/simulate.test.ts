import { describe, expect, it } from "vitest";
import { applyFix, DEFAULT_CONFIG, issueBudget } from "./config.ts";
import { percentile } from "./percentile.ts";
import { simulate } from "./simulate.ts";

describe("percentile", () => {
  it("returns 0 on empty", () => {
    expect(percentile([], 99)).toBe(0);
  });

  it("is nearest-rank", () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
    expect(percentile([1, 2, 3, 4], 100)).toBe(4);
  });
});

describe("simulate", () => {
  it("is deterministic", () => {
    const a = simulate(DEFAULT_CONFIG);
    const b = simulate(DEFAULT_CONFIG);
    expect(a.ticks).toEqual(b.ticks);
    expect(a.verdict).toBe(b.verdict);
  });

  it("collapses the default parallel salvo", () => {
    const r = simulate(DEFAULT_CONFIG);
    expect(r.verdict).toBe("collapsed");
    expect(r.bottleneck).toBe("pool");
    expect(issueBudget(DEFAULT_CONFIG)).toBe(12);
    const last = r.ticks[r.ticks.length - 1]!;
    expect(last.queueDepth).toBeGreaterThan(DEFAULT_CONFIG.queueCap);
    expect(r.ticks.length).toBeGreaterThan(3);
    expect(r.ticks.length).toBeLessThan(20);
  });

  it("survives after serialize", () => {
    const r = simulate(applyFix(DEFAULT_CONFIG, "serialize"));
    expect(r.verdict).toBe("survived");
    expect(r.ticks.every((t) => t.queueDepth <= DEFAULT_CONFIG.queueCap)).toBe(true);
  });

  it("survives after widening the pool", () => {
    const r = simulate(applyFix(DEFAULT_CONFIG, "scale_pool"));
    expect(r.verdict).toBe("survived");
  });

  it("survives after batching", () => {
    const r = simulate(applyFix(DEFAULT_CONFIG, "batch"));
    expect(r.verdict).toBe("survived");
  });

  it("same seed and config, byte-identical ticks", () => {
    const cfg = { ...DEFAULT_CONFIG, burst: 24, seed: 7 };
    expect(simulate(cfg)).toEqual(simulate(cfg));
  });
});
