import { afterEach, describe, expect, it } from "vitest";
import { fix, getSession, reset, run, setPlayback } from "../session.ts";
import { displayMetrics } from "./metrics.ts";

afterEach(() => reset());

function finishRun() {
  const s = getSession();
  const last = s.result?.ticks[s.result.ticks.length - 1];
  if (!s.result || !last) return;
  setPlayback({ playing: false, state: s.result.verdict, snap: last });
}

describe("displayMetrics", () => {
  it("uses completed as the held hero, not the drained queue", () => {
    run();
    finishRun();
    const first = getSession();
    expect(first.state).toBe("collapsed");
    const collapsed = displayMetrics(first);
    expect(collapsed?.heroLabel).toBe("queue");
    expect(collapsed?.hero).toBeGreaterThan(50);

    fix("serialize");
    run();
    finishRun();
    const held = displayMetrics(getSession());
    expect(getSession().state).toBe("survived");
    expect(held?.heroLabel).toBe("completed");
    expect(held?.hero).toBe(40 * 12);
    expect(held?.completed).toBe(480);
    expect(held?.queue).toBeGreaterThanOrEqual(0);
  });
});
