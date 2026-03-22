import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateDemoSignals } from "@/lib/ia-signals-demo";
import { __resetSignalCacheForTests, getIASignalsResult } from "@/lib/ia-signals";
import * as marketData from "@/lib/market-data";

vi.mock("@/lib/market-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market-data")>();
  return {
    ...actual,
    fetchDailyBars: vi.fn(),
  };
});

function makeOhlcBars(n: number): marketData.OhlcBar[] {
  const t0 = Date.now() - n * 86_400_000;
  return Array.from({ length: n }, (_, i) => {
    const c = 100 + i * 0.12 + Math.sin(i * 0.2) * 0.4;
    return {
      t: new Date(t0 + i * 86_400_000),
      open: c - 0.05,
      high: c + 0.45,
      low: c - 0.45,
      close: c,
      volume: 1e6,
    };
  });
}

describe("generateDemoSignals", () => {
  it("returns deterministic output for fixed seed", () => {
    const a = generateDemoSignals({ seed: 42, count: 3 });
    const b = generateDemoSignals({ seed: 42, count: 3 });
    expect(a.length).toBe(3);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(a[0]?.probability).toBeGreaterThanOrEqual(0.4);
    expect(a[0]?.probability).toBeLessThanOrEqual(0.95);
  });

  it("produces buy or sell direction and riskScore 0–1", () => {
    const s = generateDemoSignals({ seed: 7, count: 5 });
    for (const x of s) {
      expect(["buy", "sell"]).toContain(x.direction);
      expect(x.riskScore).toBeGreaterThanOrEqual(0.05);
      expect(x.riskScore).toBeLessThanOrEqual(0.95);
      expect(["low", "medium", "high"]).toContain(x.confidenceLabel);
    }
  });
});

describe("getIASignalsResult", () => {
  beforeEach(() => {
    __resetSignalCacheForTests();
    vi.unstubAllEnvs();
    vi.mocked(marketData.fetchDailyBars).mockReset();
  });

  it("Node: fallback when Yahoo returns no bars", async () => {
    process.env.USE_PYTHON_BOT = "false";
    vi.mocked(marketData.fetchDailyBars).mockResolvedValue([]);
    const r = await getIASignalsResult({ limit: 3 });
    expect(r.meta.engine).toBe("node");
    expect(r.meta.dataSource).toBe("fallback");
    expect(r.meta.pythonAttempted).toBe(false);
    expect(r.signals.length).toBe(3);
    expect(r.signals.every((s) => s.isFallback)).toBe(true);
  });

  it("Node: real path when bars suffice (no fallback)", async () => {
    process.env.USE_PYTHON_BOT = "false";
    vi.mocked(marketData.fetchDailyBars).mockImplementation(async () => makeOhlcBars(45));
    const r = await getIASignalsResult({ limit: 2 });
    expect(r.meta.engine).toBe("node");
    expect(r.meta.dataSource).toBe("yahoo");
    expect(r.signals.length).toBe(2);
    expect(r.signals.some((s) => !s.isFallback)).toBe(true);
  });

  it("Python: uses engine python when JSON is valid", async () => {
    process.env.USE_PYTHON_BOT = "true";
    process.env.INTERNAL_APP_URL = "http://127.0.0.1:3000";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        signals: [
          {
            symbol: "GC=F",
            direction: "buy",
            probability: 0.72,
            lastPrice: 2650,
            tp: 2660,
            sl: 2640,
            riskScore: 0.28,
            confidenceLabel: "high",
            ensembleGb: 0.71,
            ensembleLstm: 0.68,
            timeframe: "1D",
            createdAt: new Date().toISOString(),
            isFallback: false,
          },
        ],
      }),
    } as Response);

    const r = await getIASignalsResult({ limit: 1 });
    expect(r.meta.engine).toBe("python");
    expect(r.meta.pythonAttempted).toBe(true);
    expect(r.signals[0]?.symbol).toBe("GC=F");
    expect(r.signals[0]?.confidenceLabel).toBe("high");
    fetchSpy.mockRestore();
  });

  it("Python fail → mock fallback (demo) quando USE_PYTHON_BOT", async () => {
    process.env.USE_PYTHON_BOT = "true";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    vi.mocked(marketData.fetchDailyBars).mockImplementation(async () => makeOhlcBars(45));
    const r = await getIASignalsResult({ limit: 2 });
    expect(r.meta.engine).toBe("node-fallback");
    expect(r.meta.pythonAttempted).toBe(true);
    expect(r.meta.dataSource).toBe("fallback");
    expect(r.signals.length).toBe(2);
    expect(r.signals.every((s) => s.isFallback)).toBe(true);
    fetchSpy.mockRestore();
  });

  it("Python fail → node-fallback with fallback when Yahoo empty", async () => {
    process.env.USE_PYTHON_BOT = "true";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);
    vi.mocked(marketData.fetchDailyBars).mockResolvedValue([]);
    const r = await getIASignalsResult({ limit: 2 });
    expect(r.meta.engine).toBe("node-fallback");
    expect(r.meta.dataSource).toBe("fallback");
    expect(r.signals.every((s) => s.isFallback)).toBe(true);
    fetchSpy.mockRestore();
  });
});
