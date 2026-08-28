# Saturate — judges

Live: [https://saturate.pages.dev/](https://saturate.pages.dev/)
Editor: [https://saturate.pages.dev/#/editor](https://saturate.pages.dev/#/editor)

Saturate is a shared canvas for agent fan-out under load. You see the graph. ChatGPT sees queue depth, utilization, and a verdict. Both act on the same board through WebMCP (`document.modelContext.registerTool`).

## Fastest path (ChatGPT desktop)

1. Open the editor URL above.
2. ChatGPT desktop → Work or Codex → **GPT-5.6 Sol or Terra**.
3. **⌘⇧B**, paste the editor URL, wait for the site-tools control in the address bar.
4. Ask:

> Read the board, run it, and if it collapses, serialize then run again.

Expected:

- First `run` collapses (parallel fan-out 12, pool of 4, queue over cap 50).
- `apply_fix` with `serialize`.
- Second `run` holds. HELD card shows **480 completed**.

The human never has to click Run.

## Chrome backup

1. `chrome://flags/#enable-webmcp-testing` → Enabled → relaunch.
2. Open the editor. Header pill should read **WebMCP**.
3. [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) on that tab.
4. Same prompt.

Safari will not show WebMCP. That is expected.

## Tools

Idle: `get_board`, `list_parts`, `add_component`, `set_burst`, `set_agent`, `run`.
After collapse: `apply_fix` (`serialize` | `scale_pool` | `batch`), `explain_verdict`.
After a run: `explain_verdict`.

The page stays playable with no agent: **Run**, then **Serialize** / **Widen pool** / **Batch**.
