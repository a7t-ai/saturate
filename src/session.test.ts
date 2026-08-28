import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./engine/config.ts";
import { boardJson, fix, getSession, reset, run, setBurst, setPlayback } from "./session.ts";

describe("session", () => {
  afterEach(() => {
    reset();
  });

  it("starts idle on the default board", () => {
    expect(getSession().state).toBe("idle");
    expect(getSession().config.burst).toBe(DEFAULT_CONFIG.burst);
  });

  it("run() collides the default salvo", () => {
    run();
    const s = getSession();
    expect(s.state).toBe("running");
    expect(s.result?.verdict).toBe("collapsed");
    expect(boardJson().config.mode).toBe("parallel");
  });

  it("serialize then run survives", () => {
    run();
    finishRun();
    fix("serialize");
    expect(getSession().config.mode).toBe("sequential");
    run();
    expect(getSession().result?.verdict).toBe("survived");
  });

  it("scale_pool then run survives", () => {
    run();
    finishRun();
    const before = getSession().config.poolSize;
    fix("scale_pool");
    expect(getSession().config.poolSize).toBeGreaterThan(before);
    run();
    expect(getSession().result?.verdict).toBe("survived");
  });

  it("batch then run survives", () => {
    run();
    finishRun();
    fix("batch");
    expect(getSession().config.mode).toBe("batched");
    run();
    expect(getSession().result?.verdict).toBe("survived");
  });

  it("ignores burst while collapsed", () => {
    run();
    finishRun();
    expect(getSession().state).toBe("collapsed");
    const burst = getSession().config.burst;
    setBurst(80);
    expect(getSession().config.burst).toBe(burst);
    expect(getSession().state).toBe("collapsed");
  });
});

/** Tests skip the rAF player; mark the run finished so fixes are legal. */
function finishRun() {
  const s = getSession();
  const last = s.result?.ticks[s.result.ticks.length - 1];
  if (!s.result || !last) return;
  setPlayback({ playing: false, state: s.result.verdict, snap: last });
}
