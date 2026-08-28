import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, EXAMPLE_SERIALIZED } from "../design.ts";
import { applyFix, DEFAULT_CONFIG } from "./config.ts";
import { compile } from "./compile.ts";
import { simulate } from "./simulate.ts";

describe("compile", () => {
  it("the default salvo board compiles to DEFAULT_CONFIG", () => {
    const cfg = compile(DEFAULT_DESIGN);
    expect(cfg.burst).toBe(DEFAULT_CONFIG.burst);
    expect(cfg.fanout).toBe(DEFAULT_CONFIG.fanout);
    expect(cfg.mode).toBe(DEFAULT_CONFIG.mode);
    expect(cfg.poolSize).toBe(DEFAULT_CONFIG.poolSize);
  });

  it("a coordinator on the board serializes the loop", () => {
    expect(compile(EXAMPLE_SERIALIZED).mode).toBe("sequential");
  });

  it("compiled default board still collapses, serialized example survives", () => {
    expect(simulate(compile(DEFAULT_DESIGN)).verdict).toBe("collapsed");
    expect(simulate(compile(EXAMPLE_SERIALIZED)).verdict).toBe("survived");
  });

  it("applyFix(serialize) still matches a coordinator compile", () => {
    expect(simulate(applyFix(compile(DEFAULT_DESIGN), "serialize")).verdict).toBe("survived");
  });
});
