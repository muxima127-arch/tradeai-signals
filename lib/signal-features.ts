/**
 * Pure feature helpers — determinísticos, sem I/O (testáveis).
 */

import type { ConfidenceLabel, SignalAction } from "@/lib/ia-signals-types";

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

export function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1]!;
    const b = closes[i]!;
    if (a > 0 && b > 0) out.push(Math.log(b / a));
  }
  return out;
}

/** Último valor EMA (Wilder-style seed com SMA inicial). */
export function emaLast(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    e = values[i]! * k + e * (1 - k);
  }
  return e;
}

/** MACD linha, signal e histograma no último candle (12/26/9). */
export function macdLast(closes: number[]): { macd: number; signal: number; hist: number } | null {
  if (closes.length < 35) return null;
  const e12 = emaLast(closes, 12);
  const e26 = emaLast(closes, 26);
  if (e12 == null || e26 == null) return null;
  const macd = e12 - e26;
  const macdRecent: number[] = [];
  for (let j = 26; j < closes.length; j++) {
    const sl = closes.slice(0, j + 1);
    const a = emaLast(sl, 12);
    const b = emaLast(sl, 26);
    if (a != null && b != null) macdRecent.push(a - b);
  }
  if (macdRecent.length === 0) return null;
  const sig =
    macdRecent.length >= 9 ? emaLast(macdRecent, 9)! : macdRecent[macdRecent.length - 1]!;
  return { macd, signal: sig, hist: macd - sig };
}

/** Posição em [-1,1] dentro da banda Bollinger (20, 2σ). */
export function bollingerPosition(closes: number[], period = 20, stdMult = 2): number | null {
  if (closes.length < period) return null;
  const mid = sma(closes, period);
  if (mid == null) return null;
  const slice = closes.slice(-period);
  const sd = stdDev(slice);
  if (sd === 0) return 0;
  const last = closes[closes.length - 1]!;
  const upper = mid + stdMult * sd;
  const lower = mid - stdMult * sd;
  const pos = (last - lower) / (upper - lower) - 0.5;
  return clamp(pos * 2, -1, 1);
}

/** Volatilidade intraday (proxy): média de (high-low)/close em últimos N dias. */
export function rangeVolatilityNorm(
  highs: number[],
  lows: number[],
  closes: number[],
  lookback = 5
): number {
  if (highs.length < lookback || lows.length < lookback || closes.length < lookback) return 0;
  let sum = 0;
  for (let i = highs.length - lookback; i < highs.length; i++) {
    const c = closes[i]!;
    if (c > 0) sum += (highs[i]! - lows[i]!) / c;
  }
  return clamp(sum / lookback, 0, 0.15);
}

/** Wilder's RSI (14) on closes */
export function rsi14(closes: number[]): number | null {
  if (closes.length < 15) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    if (ch >= 0) gains += ch;
    else losses -= ch;
  }
  const avgG = gains / 14;
  const avgL = losses / 14;
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}

export function averageTrueRange(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number | null {
  if (highs.length !== lows.length || highs.length !== closes.length || highs.length < period + 1) {
    return null;
  }
  const trs: number[] = [];
  for (let i = highs.length - period; i < highs.length; i++) {
    const h = highs[i]!;
    const l = lows[i]!;
    const pc = closes[i - 1]!;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

export interface EngineFeatures {
  momentum: number;
  rsiNorm: number;
  volPenalty: number;
  score: number;
}

/** Score legacy (momentum + RSI + vol). */
export function scoreFromSeries(closes: number[]): EngineFeatures | null {
  if (closes.length < 25) return null;
  const sma20 = sma(closes, 20);
  if (sma20 == null || sma20 === 0) return null;
  const last = closes[closes.length - 1]!;
  const momentum = (last - sma20) / sma20;
  const rsi = rsi14(closes);
  const rsiNorm = rsi == null ? 0 : (rsi - 50) / 50;
  const lr = logReturns(closes);
  const vol = stdDev(lr.slice(-20));
  const volPenalty = clamp(vol * 25, 0, 0.35);

  let score = clamp(momentum * 40, -0.55, 0.55) * 0.55 + rsiNorm * 0.35 - volPenalty * 0.25;
  score = clamp(score, -1, 1);

  return { momentum, rsiNorm, volPenalty, score };
}

export interface EnsembleResult {
  /** Score final [-1,1] para direção. */
  score: number;
  /** Proxies “GB” e “LSTM” para UI (0–1). */
  gb: number;
  lstm: number;
  macdHistNorm: number;
  bollNorm: number;
}

/**
 * Ensemble: combina score clássico, MACD, Bollinger e tendência EMA12/26.
 */
export function ensembleScoreFromBars(
  closes: number[],
  highs: number[],
  lows: number[]
): EnsembleResult | null {
  if (closes.length < 40) return null;
  const base = scoreFromSeries(closes);
  if (!base) return null;

  const macd = macdLast(closes);
  const last = closes[closes.length - 1]!;
  const macdHistNorm = macd
    ? clamp(Math.tanh((macd.hist / last) * 800), -1, 1)
    : 0;

  const boll = bollingerPosition(closes, 20, 2) ?? 0;

  const ema12 = emaLast(closes, 12);
  const ema26 = emaLast(closes, 26);
  const emaTrend =
    ema12 != null && ema26 != null && last > 0
      ? clamp(((ema12 - ema26) / last) * 50, -0.4, 0.4)
      : 0;

  const rangeVol = rangeVolatilityNorm(highs, lows, closes, 5);
  const volAdj = clamp(rangeVol * 8, 0, 0.12);

  let score =
    base.score * 0.38 +
    macdHistNorm * 0.22 +
    boll * 0.18 +
    emaTrend * 0.22 -
    volAdj * 0.15;
  score = clamp(score, -1, 1);

  const gb = clamp(0.5 + base.momentum * 15 + macdHistNorm * 0.22, 0.15, 0.95);
  const lstm = clamp(0.5 + base.rsiNorm * 0.35 + boll * 0.2 + emaTrend * 0.25, 0.15, 0.95);

  return { score, gb, lstm, macdHistNorm, bollNorm: boll };
}

export function actionFromScore(score: number): SignalAction {
  return score >= 0 ? "BUY" : "SELL";
}

export function probabilityFromScore(absScore: number): number {
  return clamp(0.4 + absScore * 0.5, 0.32, 0.94);
}

/**
 * Risco agregado 0–1: ATR relativo, volatilidade de range, reward/risk.
 */
export function riskScore01(params: {
  atrOverPrice: number;
  rangeVolNorm: number;
  rewardRisk: number;
}): number {
  const atrR = clamp(params.atrOverPrice * 35, 0, 0.42);
  const volR = clamp(params.rangeVolNorm * 4, 0, 0.38);
  const rr = params.rewardRisk;
  const rrPenalty = rr < 1.2 ? 0.2 : rr > 2.8 ? 0.06 : 0.14;
  return clamp(atrR * 0.42 + volR * 0.38 + rrPenalty * 0.2, 0, 1);
}

export function confidenceLabelFrom(probability: number, risk01: number): ConfidenceLabel {
  const conf = probability * (1 - risk01 * 0.55);
  if (conf >= 0.58) return "high";
  if (conf >= 0.38) return "medium";
  return "low";
}
