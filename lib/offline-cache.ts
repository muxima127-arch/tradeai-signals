import type { GeneratedSignal } from "@/lib/ia-signals-types";

const KEY = "tradeai-signals-cache";

export function cacheSignalsOffline(signals: GeneratedSignal[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ t: Date.now(), signals })
    );
  } catch {
    /* quota / private mode */
  }
}

export function readCachedSignals(): GeneratedSignal[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { signals?: GeneratedSignal[] };
    return parsed.signals ?? null;
  } catch {
    return null;
  }
}
