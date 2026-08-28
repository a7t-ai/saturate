import { useMemo, useState } from "react";
import { CATALOG, type Kind } from "../design.ts";
import { addNode, loadExample, reset, run } from "../session.ts";

export function CommandPalette({ open, onClose, canEdit }: { open: boolean; onClose: () => void; canEdit: boolean }) {
  const [q, setQ] = useState("");
  const items = useMemo(() => {
    const all = [
      { id: "run", label: "Run simulation", run: () => run() },
      { id: "reset", label: "Reset to Saturate", run: () => reset() },
      { id: "ex-ser", label: "Open example: Serialized loop", run: () => loadExample("serialized") },
      { id: "ex-cache", label: "Open example: Cached tools", run: () => loadExample("cached") },
      ...CATALOG.map((c) => ({
        id: `add-${c.kind}`,
        label: `Add ${c.label}`,
        run: () => {
          if (canEdit) addNode(c.kind as Kind, 80, 40);
        },
      })),
    ];
    const n = q.trim().toLowerCase();
    return n ? all.filter((i) => i.label.toLowerCase().includes(n)) : all;
  }, [q, canEdit]);

  if (!open) return null;
  return (
    <div className="cmdk-scrim" onClick={onClose}>
      <div className="cmdk" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <input
          className="cmdk-input"
          autoFocus
          placeholder="Run, add a component, open an example…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && items[0]) {
              items[0].run();
              onClose();
            }
          }}
        />
        <ul className="cmdk-list">
          {items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                className="cmdk-item"
                onClick={() => {
                  i.run();
                  onClose();
                }}
              >
                {i.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
