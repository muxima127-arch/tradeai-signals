import { describe, expect, it } from "vitest";
import {
  averageTrueRange,
  bollingerPosition,
  clamp,
  confidenceLabelFrom,
  emaLast,
  ensembleScoreFromBars,
  macdLast,
  probabilityFromScore,
  rangeVolatilityNorm,
  riskScore01,
  rsi14,
  scoreFromSeries,
  sma,
} from "@/lib/signal-features";

const closes45 = Array.from({ length: 45 }, (_, i) => 100 + i * 0.1 + Math.sin(i * 0.3) * 0.6);
const highs45 = closes45.map((c) => c + 0.4);
const lows45 = closes45.map((c) => c - 0.4);

describe("signal-features", () => {
  it("sma computes mean of tail", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toBeCloseTo(4);
  });

  it("scoreFromSeries returns bounded score", () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + i * 0.1 + Math.sin(i) * 0.5);
    const s = scoreFromSeries(closes);
    expect(s).not.toBeNull();
    expect(s!.score).toBeGreaterThanOrEqual(-1);
    expect(s!.score).toBeLessThanOrEqual(1);
  });

  it("probabilityFromScore is in range", () => {
    expect(probabilityFromScore(0)).toBeGreaterThanOrEqual(0.32);
    expect(probabilityFromScore(1)).toBeLessThanOrEqual(0.94);
  });

  it("clamp works", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it("emaLast tracks last EMA", () => {
    const e = emaLast(closes45, 12);
    expect(e).not.toBeNull();
    expect(e!).toBeGreaterThan(90);
  });

  it("macdLast returns macd, signal, hist", () => {
    const m = macdLast(closes45);
    expect(m).not.toBeNull();
    expect(m!.macd).toBeDefined();
    expect(Math.abs(m!.hist)).toBeLessThan(50);
  });

  it("bollingerPosition is in [-1,1]", () => {
    const b = bollingerPosition(closes45);
    expect(b).not.toBeNull();
    expect(b!).toBeGreaterThanOrEqual(-1);
    expect(b!).toBeLessThanOrEqual(1);
  });

  it("rangeVolatilityNorm is bounded", () => {
    const v = rangeVolatilityNorm(highs45, lows45, closes45, 5);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(0.15);
  });

  it("rsi14 is between 0 and 100", () => {
    const r = rsi14(closes45);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThanOrEqual(0);
    expect(r!).toBeLessThanOrEqual(100);
  });

  it("averageTrueRange is positive", () => {
    const a = averageTrueRange(highs45, lows45, closes45, 14);
    expect(a).not.toBeNull();
    expect(a!).toBeGreaterThan(0);
  });

  it("ensembleScoreFromBars combines features", () => {
    const e = ensembleScoreFromBars(closes45, highs45, lows45);
    expect(e).not.toBeNull();
    expect(e!.score).toBeGreaterThanOrEqual(-1);
    expect(e!.score).toBeLessThanOrEqual(1);
    expect(e!.gb).toBeGreaterThanOrEqual(0.15);
    expect(e!.lstm).toBeGreaterThanOrEqual(0.15);
  });

  it("riskScore01 aggregates ATR, vol, RR", () => {
    const r = riskScore01({
      atrOverPrice: 0.02,
      rangeVolNorm: 0.05,
      rewardRisk: 1.8,
    });
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
  });

  it("confidenceLabelFrom maps prob and risk", () => {
    expect(confidenceLabelFrom(0.85, 0.1)).toBe("high");
    expect(confidenceLabelFrom(0.5, 0.4)).toBe("medium");
    expect(confidenceLabelFrom(0.4, 0.9)).toBe("low");
  });
});
