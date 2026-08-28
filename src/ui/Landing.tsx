function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 100" fill="none" aria-hidden="true">
      <circle cx="52" cy="50" r="28" fill="none" stroke="var(--ink, currentColor)" strokeWidth="12" />
      <circle cx="146" cy="50" r="34" fill="var(--brand-dot, #2fabb3)" />
    </svg>
  );
}

export function Landing({ onOpen, webmcp }: { onOpen: () => void; webmcp: boolean }) {
  return (
    <div className="lp">
      <header className="lp-nav">
        <span className="lp-brand">
          <BrandMark className="editor-mark" />
          Saturate
        </span>
        <button type="button" className="ui-btn ui-btn-primary" onClick={onOpen}>
          Open editor
        </button>
      </header>
      <section className="lp-hero">
        <p className="lp-kicker">WebMCP · agent-native canvas</p>
        <h1>See the graph saturate.</h1>
        <p className="lp-lead">
          Design an agent the way you design a system. Fan out a burst of tool calls, watch the
          queue form, and recover — you and ChatGPT on the same live board.
        </p>
        <div className="lp-cta">
          <button type="button" className="ui-btn ui-btn-primary" onClick={onOpen}>
            Open the Saturate board
          </button>
          <span className="lp-hint">No account. Drag components. Hit Run.</span>
        </div>
      </section>
      <section className="lp-grid">
        <article>
          <h2>Shared canvas</h2>
          <p>The human sees dots and heat. The agent sees queue depth, utilization, and a verdict.</p>
        </article>
        <article>
          <h2>Real topology</h2>
          <p>Burst, agent, coordinator, tools, pools, queues, cache. Wire them. Then load them.</p>
        </article>
        <article>
          <h2>Collapse, then fix</h2>
          <p>Serialize the loop, widen the pool, or batch the fan-out. Run again until it holds.</p>
        </article>
      </section>
      <section className="lp-steps">
        <h2>How a run works</h2>
        <ol>
          <li>Open the editor. The Saturate board is already placed.</li>
          <li>Drag extra parts from the rail. Green handle wires an edge.</li>
          <li>Run. If it saturates, apply a fix and run until it survives.</li>
        </ol>
      </section>
      <section className="lp-steps lp-mcp">
        <h2>Talk to this board</h2>
        <p className={webmcp ? "lp-mcp-on" : "lp-mcp-off"}>
          {webmcp
            ? "WebMCP is live in this tab. Tools are registered."
            : "ChatGPT in this window will not call the tools. Site tools live in the ChatGPT desktop app’s built-in browser."}
        </p>
        <ol>
          <li>Open the editor on this site. The Saturate board is already placed.</li>
          <li>
            In the <strong>ChatGPT desktop app</strong>, start a Work or Codex chat on GPT-5.6 Sol or
            Terra. Press ⌘⇧B, open this same page, and wait for the site-tools control in the
            address bar.
          </li>
          <li>Ask the prompt below. Approve the tool calls. You should see collapse, then hold.</li>
        </ol>
        <blockquote className="lp-prompt">
          Read the board, run it, and if it collapses, serialize then run again.
        </blockquote>
        <p className="lp-mcp-alt">
          Chrome-only dry run: enable <code>chrome://flags/#enable-webmcp-testing</code>, relaunch,
          then inspect the editor with the{" "}
          <a href="https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd">
            Model Context Tool Inspector
          </a>
          .
        </p>
      </section>
      <footer className="lp-foot">
        Saturate · a board for agent fan-out under load
        <span className="lp-foot-sep">·</span>
        Related:{" "}
        <a href="https://backpressure.systems" rel="noreferrer">
          backpressure.systems
        </a>
      </footer>
    </div>
  );
}
