import { CATALOG } from "../design.ts";
import type { Kind } from "../design.ts";
import { addNode, boardJson, fix, getSession, run, setAgent, setBurst } from "../session.ts";
import type { Fix, Mode } from "../engine/types.ts";

export function webmcpAvailable(): boolean {
  return typeof document !== "undefined" && typeof document.modelContext?.registerTool === "function";
}

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => Promise<void>;
    };
  }
}

interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

const EMPTY_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

function json(data: unknown) {
  return JSON.stringify(data);
}

export async function registerTools(signal: AbortSignal): Promise<void> {
  if (typeof document === "undefined") return;
  const ctx = document.modelContext;
  if (typeof ctx?.registerTool !== "function") return;
  const state = getSession().state;
  const opts = { signal };

  try {
  await ctx.registerTool(
    {
      name: "get_board",
      description: "Read the live Saturate board: config, queue, utilization, and verdict.",
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true },
      execute: () => json(boardJson()),
    },
    opts,
  );

  if (state === "idle") {
    await ctx.registerTool(
      {
        name: "list_parts",
        description: "List the parts on this board and what they do.",
        inputSchema: EMPTY_SCHEMA,
        annotations: { readOnlyHint: true },
        execute: () => json({ parts: CATALOG.map((c) => ({ id: c.kind, label: c.label, group: c.group, description: c.blurb })) }),
      },
      opts,
    );
  }

  if (state === "idle" || state === "survived") {
    await ctx.registerTool(
      {
        name: "add_component",
        description: "Drop a catalog part onto the board: load, agent, coordinator, tool, pool, queue, or cache.",
        inputSchema: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["load", "agent", "coordinator", "tool", "pool", "queue", "cache"] },
            x: { type: "number" },
            y: { type: "number" },
          },
          required: ["kind"],
          additionalProperties: false,
        },
        execute: (input) => json(boardJson(addNode(String(input.kind) as Kind, Number(input.x ?? 80), Number(input.y ?? 40)))),
      },
      opts,
    );
    await ctx.registerTool(
      {
        name: "set_burst",
        description: "Set how many concurrent requests hit the agent (8-80).",
        inputSchema: {
          type: "object",
          properties: { requests: { type: "integer", minimum: 8, maximum: 80 } },
          required: ["requests"],
          additionalProperties: false,
        },
        execute: (input) => json(boardJson(setBurst(Number(input.requests)))),
      },
      opts,
    );
    await ctx.registerTool(
      {
        name: "set_agent",
        description: "Set tool fan-out, mode (parallel | sequential | batched), and optional batch size.",
        inputSchema: {
          type: "object",
          properties: {
            fanout: { type: "integer", minimum: 1, maximum: 24 },
            mode: { type: "string", enum: ["parallel", "sequential", "batched"] },
            batchSize: { type: "integer", minimum: 1, maximum: 12 },
          },
          additionalProperties: false,
        },
        execute: (input) =>
          json(
            boardJson(
              setAgent({
                fanout: input.fanout == null ? undefined : Number(input.fanout),
                mode: typeof input.mode === "string" ? (input.mode as Mode) : undefined,
                batchSize: input.batchSize == null ? undefined : Number(input.batchSize),
              }),
            ),
          ),
      },
      opts,
    );
  }

  if (state !== "running") {
    await ctx.registerTool(
      {
        name: "run",
        description: "Start a deterministic run of the current board. Watch the canvas for saturation.",
        inputSchema: EMPTY_SCHEMA,
        execute: () => json(boardJson(run())),
      },
      opts,
    );
  }

  if (state === "collapsed") {
    await ctx.registerTool(
      {
        name: "apply_fix",
        description: "Apply a fix to a collapsed board: serialize, scale_pool, or batch. Then run again.",
        inputSchema: {
          type: "object",
          properties: { fix: { type: "string", enum: ["serialize", "scale_pool", "batch"] } },
          required: ["fix"],
          additionalProperties: false,
        },
        execute: (input) => json(boardJson(fix(String(input.fix) as Fix))),
      },
      opts,
    );
  }

  if (state === "collapsed" || state === "survived") {
    await ctx.registerTool(
      {
        name: "explain_verdict",
        description: "Explain why the last run collapsed or survived, and what to try next.",
        inputSchema: EMPTY_SCHEMA,
        annotations: { readOnlyHint: true },
        execute: () => {
          const s = getSession();
          const next =
            s.result?.verdict === "collapsed"
              ? [
                  "serialize: issue one tool at a time",
                  "scale_pool: add 8 workers",
                  "batch: issue 3 tools at a time",
                ]
              : ["raise burst", "switch mode back to parallel to see collapse again"];
          return json({
            ...boardJson(s),
            advice: next,
          });
        },
      },
      opts,
    );
  }
  } catch {
    // Native WebMCP can reject while a previous AbortSignal is tearing down.
  }
}
