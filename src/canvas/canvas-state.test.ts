import { describe, expect, it } from "vitest";
import { FIT_CHROME, fitView, ORIGIN } from "./canvas-state.ts";

const viewport = { width: 1440, height: 900 };

describe("fitView", () => {
  it("returns ORIGIN when the board is empty", () => {
    expect(fitView([], viewport)).toEqual(ORIGIN);
  });

  it("pans the default board into the gap between the rails", () => {
    const view = fitView(
      [{ position: { x: -20, y: 0 } }, { position: { x: 230, y: 0 } }, { position: { x: 480, y: 0 } }],
      viewport,
    );
    expect(view.zoom).toBe(1);
    const usableW = viewport.width - FIT_CHROME.left - FIT_CHROME.right;
    const usableCx = FIT_CHROME.left + usableW / 2 - viewport.width / 2;
    expect(view.x).toBeCloseTo(usableCx - 230, 5);
    expect(view.y).toBeCloseTo(FIT_CHROME.top + (viewport.height - FIT_CHROME.top - FIT_CHROME.bottom) / 2 - viewport.height / 2, 5);
  });

  it("zooms out to keep a wide graph inside the usable frame", () => {
    const view = fitView([{ position: { x: -800, y: 0 } }, { position: { x: 800, y: 0 } }], viewport);
    expect(view.zoom).toBeLessThan(1);
    expect(view.x).toBeCloseTo(FIT_CHROME.left + (viewport.width - FIT_CHROME.left - FIT_CHROME.right) / 2 - viewport.width / 2, 5);
  });
});
