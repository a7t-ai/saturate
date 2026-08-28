import type { BoardState, Fix } from "../engine/types.ts";
import { loadExample } from "../session.ts";

function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 100" fill="none" aria-hidden="true">
      <circle cx="52" cy="50" r="28" fill="none" stroke="var(--ink, currentColor)" strokeWidth="12" />
      <circle cx="146" cy="50" r="34" fill="var(--brand-dot, #2fabb3)" />
    </svg>
  );
}

export function EditorHeader({
  title,
  state,
  playing,
  onRun,
  onReset,
  onFix,
  onHome,
  onCommand,
  webmcp,
}: {
  title: string;
  state: BoardState;
  playing: boolean;
  onRun: () => void;
  onReset: () => void;
  onFix: (fix: Fix) => void;
  onHome: () => void;
  onCommand: () => void;
  webmcp: boolean;
}) {
  const phase =
    state === "running" || playing
      ? "phase-running"
      : state === "collapsed"
        ? "phase-collapsed"
        : state === "survived"
          ? "phase-held"
          : "";
  const label =
    playing || state === "running" ? "Running" : state === "collapsed" ? "Collapsed" : state === "survived" ? "Held" : "Editing";
  const canRun = state !== "running" && !playing;
  const canFix = state === "collapsed" && !playing;

  return (
    <header className="editor-head">
      <div className="editor-head-left">
        <button type="button" className="editor-brand" onClick={onHome} aria-label="Saturate home">
          <BrandMark className="editor-mark" />
        </button>
        <span className="sim-name sim-name-static">{title}</span>
        <span className={`status-badge ${phase}`}>{label}</span>
        <span
          className={`status-badge ${webmcp ? "webmcp-on" : "webmcp-off"}`}
          title={
            webmcp
              ? "This page registered tools on document.modelContext. ChatGPT in this Chrome tab will not call them — use ChatGPT desktop’s built-in browser, or the Model Context Tool Inspector."
              : "document.modelContext is missing. Enable chrome://flags/#enable-webmcp-testing, relaunch, then hard-refresh. ChatGPT itself only sees tools in the desktop app browser."
          }
        >
          {webmcp ? "WebMCP" : "No WebMCP"}
        </span>
      </div>
      <div className="editor-head-right">
        <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={onCommand}>
          ⌘K
        </button>
        <select
          className="example-select"
          aria-label="Example boards"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v === "saturate" || v === "serialized" || v === "cached") loadExample(v);
            e.currentTarget.value = "";
          }}
        >
          <option value="" disabled>
            Examples
          </option>
          <option value="saturate">Saturate</option>
          <option value="serialized">Serialized loop</option>
          <option value="cached">Cached tools</option>
        </select>
        {canFix ? (
          <>
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => onFix("serialize")}>
              Serialize
            </button>
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => onFix("scale_pool")}>
              Widen pool
            </button>
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => onFix("batch")}>
              Batch
            </button>
          </>
        ) : null}
        <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="ui-btn ui-btn-primary run" disabled={!canRun} onClick={onRun}>
          {playing ? "Running" : "Run"}
        </button>
      </div>
    </header>
  );
}
