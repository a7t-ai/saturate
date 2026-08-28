import type { Session } from "../session.ts";

export interface DisplayMetrics {
  queue: number;
  inService: number;
  poolSize: number;
  utilization: number;
  issued: number;
  completed: number;
  p99Wait: number | null;
  hero: number;
  heroLabel: string;
  live: boolean;
}

export function displayMetrics(session: Session): DisplayMetrics | null {
  const snap = session.snap;
  if (!snap) return null;
  const ticks = session.result?.ticks ?? [];
  const live = session.playing || session.state === "running";
  const peakQueue = ticks.length ? Math.max(...ticks.map((t) => t.queueDepth)) : snap.queueDepth;
  const peakIn = ticks.length ? Math.max(...ticks.map((t) => t.inService)) : snap.inService;
  const peakUtil = ticks.length ? Math.max(...ticks.map((t) => t.utilization)) : snap.utilization;
  const held = session.state === "survived";
  return {
    queue: live ? snap.queueDepth : peakQueue,
    inService: live ? snap.inService : peakIn,
    poolSize: session.config.poolSize,
    utilization: live ? snap.utilization : peakUtil,
    issued: snap.emitted,
    completed: snap.completed,
    p99Wait: live ? snap.p99Wait : (session.result?.p99Wait ?? snap.p99Wait),
    hero: held ? snap.completed : live ? snap.queueDepth : peakQueue,
    heroLabel: held ? "completed" : "queue",
    live,
  };
}
