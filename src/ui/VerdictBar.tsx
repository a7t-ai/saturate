import { lineFor, type Session } from "../session.ts";
import { LiveMetrics } from "./LiveMetrics.tsx";
import { displayMetrics } from "./metrics.ts";

export function VerdictBar({ session }: { session: Session }) {
  const failed = session.state === "collapsed";
  const held = session.state === "survived";
  const m = displayMetrics(session);
  return (
    <div className="editor-rail editor-rail-right">
      <div className="right-rail">
        {failed || held ? (
          <section className={`verdict-bar verdict-bar-${failed ? "collapsed" : "held"}`} role="status">
            <div className="verdict-strip">
              <span className="verdict-bar-dot" aria-hidden="true" />
              <span className="verdict-bar-label">{failed ? "Collapsed" : "Held"}</span>
            </div>
            <div className="verdict-collapsible">
              <div className="verdict-collapsible-inner">
                <div className="verdict-measure">
                  {m ? (
                    <>
                      <span className="verdict-bar-number">{m.hero}</span>
                      <span className="verdict-bar-unit">{m.heroLabel}</span>
                    </>
                  ) : null}
                  <span className="verdict-bar-detail">{lineFor(session)}</span>
                </div>
              </div>
            </div>
          </section>
        ) : null}
        <LiveMetrics session={session} />
      </div>
    </div>
  );
}
