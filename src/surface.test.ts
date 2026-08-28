import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATALOG } from "./design.ts";
import { registerTools, webmcpAvailable } from "./webmcp/register.ts";

const root = join(dirname(fileURLToPath(import.meta.url)));

function src(name: string): string {
  return readFileSync(join(root, name), "utf8");
}

describe("page surface", () => {
  it("ships a landing, editor, Burst/Agent/Pool, Run, and the judge prompt", () => {
    const app = src("App.tsx");
    const header = src("ui/EditorHeader.tsx");
    const palette = src("ui/Palette.tsx");
    const landing = src("ui/Landing.tsx");
    expect(landing).toContain("See the graph saturate.");
    expect(landing).toContain("Open the Saturate board");
    expect(landing).toContain("Talk to this board");
    expect(landing).toContain("ChatGPT desktop");
    expect(landing).toContain("Read the board, run it, and if it collapses, serialize then run again.");
    expect(landing).toContain("backpressure.systems");
    expect(landing).not.toContain("127.0.0.1");
    expect(src("../README.md")).toContain("backpressure.systems");
    expect(src("../vite.config.ts")).toContain("Origin-Agent-Cluster");
    expect(src("../public/_headers")).toContain("Origin-Agent-Cluster: ?1");
    expect(src("../vercel.json")).toContain("Origin-Agent-Cluster");
    expect(src("design.ts")).toContain('title: "Saturate"');
    expect(header).toContain(">Saturate<");
    expect(src("index.css")).toContain(".editor-brand {");
    expect(src("index.css")).toMatch(/\.editor-brand \{[\s\S]*?background:\s*transparent;/);
    expect(header).toContain('"Run"');
    expect(header).toContain('className="ui-btn ui-btn-primary run"');
    expect(app).toContain("onRun={run}");
    expect(app).toContain("Landing");
    expect(app).toContain("CommandPalette");
    expect(palette).toContain("Drag a component onto the board");
    expect(palette).toContain("under a burst of 40 requests");
    expect(CATALOG.some((c) => c.label === "Burst")).toBe(true);
    expect(CATALOG.some((c) => c.label === "Agent")).toBe(true);
    expect(CATALOG.some((c) => c.label === "Worker pool")).toBe(true);
  });

  it("registers WebMCP only when document.modelContext.registerTool exists", () => {
    const register = src("webmcp/register.ts");
    expect(register).toContain("document.modelContext");
    expect(register).toContain("registerTool");
    expect(register).toContain("add_component");
    expect(register).toContain("JSON.stringify");
    expect(webmcpAvailable()).toBe(false);
  });

  it("registerTools is a no-op without WebMCP", async () => {
    const ac = new AbortController();
    await expect(registerTools(ac.signal)).resolves.toBeUndefined();
  });
});
