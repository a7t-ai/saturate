import { catalogGroups, type Kind } from "../design.ts";
import { beginPaletteDrag } from "../session.ts";

export function Palette({ canEdit, webmcp }: { canEdit: boolean; webmcp: boolean }) {
  return (
    <div className="editor-rail editor-rail-left">
      <aside className="app-sidebar">
        <div className="app-sidebar-head">
          <div className="sim-section-label">Components</div>
        </div>
        <div className="app-sidebar-body">
          <div className="palette">
            <div className="palette-scroll">
              {catalogGroups().map((g) => (
                <section key={g.group} className="palette-group">
                  <h3 className="palette-group-title">{g.group}</h3>
                  <ul className="palette-items">
                    {g.items.map((c) => (
                      <li key={c.kind}>
                        <button
                          type="button"
                          className="palette-item"
                          title={c.blurb}
                          disabled={!canEdit}
                          onPointerDown={(e) => {
                            if (e.button !== 0 || !canEdit) return;
                            beginPaletteDrag(c.kind as Kind);
                          }}
                        >
                          {c.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <p className="palette-empty">
              Drag a component onto the board, then drag the green handle to wire it. Run this agent
              under a burst of 40 requests. If it saturates, fix it and run again until it survives.
            </p>
            <p className="palette-mcp">
              {webmcp
                ? "WebMCP is live. Ask an agent: “Read the board, run it, and if it collapses, serialize then run again.”"
                : "WebMCP is off in this tab. An agent only sees the board from ChatGPT desktop’s browser, or Chrome’s Model Context Tool Inspector — not from ChatGPT in this window."}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
