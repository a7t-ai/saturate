# Saturate

Live demo: [saturate.pages.dev](https://saturate.pages.dev/)

See the graph saturate. A live canvas where a human and ChatGPT share one agent graph, fan out a burst of tool calls, and watch it collapse or recover.

Built for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/). Related work: [backpressure.systems](https://backpressure.systems) — LLM serving under load.

## Talk to the board

ChatGPT in a normal Chrome window will not call these tools. Site tools live in the **ChatGPT desktop** app’s built-in browser.

1. Open [saturate.pages.dev/#/editor](https://saturate.pages.dev/#/editor).
2. ChatGPT desktop → Work or Codex → **GPT-5.6 Sol or Terra** (Luna has site tools off).
3. Press **⌘⇧B**, open that same page, wait for the site-tools control in the address bar.
4. Ask:

> Read the board, run it, and if it collapses, serialize then run again.

You should see a parallel collapse, a serialize, then a hold — without clicking Run.

Chrome-only dry run: enable `chrome://flags/#enable-webmcp-testing`, relaunch, and use the [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) on the editor.

Judges: see [`docs/JUDGES.md`](docs/JUDGES.md).

## Develop

```
pnpm install
pnpm test
pnpm dev
```

Dev server binds `http://127.0.0.1:5173/`. The page sends `Origin-Agent-Cluster: ?1` so `document.modelContext` can exist.

MIT. Copyright (c) 2026 Leo Cardoso.
