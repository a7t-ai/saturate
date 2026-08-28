import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EditorCanvas } from "./canvas/EditorCanvas.tsx";
import { CommandPalette } from "./ui/CommandPalette.tsx";
import { EditorHeader } from "./ui/EditorHeader.tsx";
import { Landing } from "./ui/Landing.tsx";
import { Palette } from "./ui/Palette.tsx";
import { VerdictBar } from "./ui/VerdictBar.tsx";
import { fix, getSession, reset, run, setPlayback, subscribe } from "./session.ts";
import { registerTools, webmcpAvailable } from "./webmcp/register.ts";

function pageFromHash(): "landing" | "editor" {
  return location.hash.replace(/^#/, "") === "/editor" ? "editor" : "landing";
}

export default function App() {
  const session = useSyncExternalStore(subscribe, getSession, getSession);
  const [page, setPage] = useState(pageFromHash);
  const [cmdk, setCmdk] = useState(false);
  const playRef = useRef({ i: 0, acc: 0, last: 0, raf: 0 });

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdk((v) => !v);
      }
      if (e.key === "Escape") setCmdk(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!session.playing || !session.result) return;
    const ticks = session.result.ticks;
    const verdict = session.result.verdict;
    const st = playRef.current;
    st.i = 0;
    st.acc = 0;
    st.last = performance.now();
    const loop = (now: number) => {
      const dt = now - st.last;
      st.last = now;
      st.acc += dt;
      const cur = ticks[st.i];
      if (!cur) {
        setPlayback({ playing: false, state: verdict });
        return;
      }
      const ms = cur.queueDepth > 8 || cur.utilization > 0.8 ? 72 : 18;
      if (st.acc >= ms) {
        st.acc = 0;
        if (cur.state !== "running") {
          setPlayback({ snap: cur, playing: false, state: cur.state });
          return;
        }
        st.i += 1;
        const next = ticks[st.i];
        if (!next) {
          setPlayback({ playing: false, state: verdict });
          return;
        }
        setPlayback({ snap: next });
      }
      st.raf = requestAnimationFrame(loop);
    };
    st.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(st.raf);
  }, [session.playing, session.result]);

  const [mcp, setMcp] = useState(webmcpAvailable);
  useEffect(() => {
    let cancelled = false;
    let ac: AbortController | null = null;
    let timer = 0;
    const arm = () => {
      ac?.abort();
      const ok = webmcpAvailable();
      setMcp(ok);
      if (!ok) return false;
      ac = new AbortController();
      void registerTools(ac.signal);
      return true;
    };
    if (!arm()) {
      let n = 0;
      const poll = () => {
        if (cancelled) return;
        if (arm() || n++ > 24) return;
        timer = window.setTimeout(poll, 250);
      };
      timer = window.setTimeout(poll, 250);
    }
    return () => {
      cancelled = true;
      ac?.abort();
      window.clearTimeout(timer);
    };
  }, [session.state]);

  function openEditor() {
    location.hash = "/editor";
  }

  if (page === "landing") {
    return <Landing onOpen={openEditor} webmcp={mcp} />;
  }

  const canEdit = (session.state === "idle" || session.state === "survived") && !session.playing;

  return (
    <div className="app-shell">
      <EditorCanvas
        design={session.design}
        config={session.config}
        snap={session.snap}
        boardState={session.state}
        selected={session.selected}
        canEdit={canEdit}
      />
      <EditorHeader
        title={session.design.title}
        state={session.state}
        playing={session.playing}
        onRun={run}
        onReset={reset}
        onFix={fix}
        onHome={() => {
          location.hash = "/";
        }}
        onCommand={() => setCmdk(true)}
        webmcp={mcp}
      />
      <Palette canEdit={canEdit} webmcp={mcp} />
      <VerdictBar session={session} />
      <CommandPalette open={cmdk} onClose={() => setCmdk(false)} canEdit={canEdit} />
    </div>
  );
}
