import type { Session } from "../session.ts";
import { displayMetrics } from "./metrics.ts";

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="live-metrics-row">
      <dt>{label}</dt>
      <dd className={danger ? "danger" : undefined}>{value}</dd>
    </div>
  );
}

export function LiveMetrics({ session }: { session: Session }) {
  const m = displayMetrics(session);
  const atRest = !m || session.state === "idle";
  return (
    <section className="live-metrics">
      <header className="live-metrics-head">
        <span className="live-metrics-title">Live metrics</span>
      </header>
      <div className="live-metrics-collapsible">
        <div className="live-metrics-collapsible-inner">
          <div className="live-metrics-body">
            {atRest || !m ? (
              <p className="live-metrics-empty">Run the board to simulate concurrent tool calls.</p>
            ) : (
              <dl className="live-metrics-grid">
                <Metric
                  label={m.live ? "Queue" : "Peak queue"}
                  value={String(m.queue)}
                  danger={m.queue > session.config.queueCap * 0.8}
                />
                <Metric label={m.live ? "In service" : "Peak in service"} value={`${m.inService}/${m.poolSize}`} />
                <Metric
                  label={m.live ? "Utilization" : "Peak util"}
                  value={`${Math.round(m.utilization * 100)}%`}
                  danger={m.utilization >= 0.9}
                />
                <Metric label="Issued" value={String(m.issued)} />
                <Metric label="Completed" value={String(m.completed)} />
                <Metric label="p99 wait" value={m.p99Wait == null ? "—" : `${m.p99Wait} ticks`} />
              </dl>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
