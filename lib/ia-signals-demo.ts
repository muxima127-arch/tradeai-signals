/**
 * Demo-only signals for the marketing page (no Yahoo / no server bundle).
 */

import type { GeneratedSignal, TradeDirection } from "@/lib/ia-signals-types";
import { clamp, confidenceLabelFrom } from "@/lib/signal-features";

const ASSETS: { asset: string; symbol: string; decimals: number }[] = [
  { asset: "Brent Crude", symbol: "BZ=F", decimals: 2 },
  { asset: "Gold", symbol: "GC=F", decimals: 2 },
  { asset: "S&P 500", symbol: "ES=F", decimals: 2 },
  { asset: "EUR/USD", symbol: "EURUSD=X", decimals: 5 },
  { asset: "GBP/USD", symbol: "GBPUSD=X", decimals: 5 },
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GenerateDemoOptions {
  seed?: number;
  count?: number;
}

/**
 * Deterministic demo signals for landing page charts (no external APIs).
 */
export function generateDemoSignals(options: GenerateDemoOptions = {}): GeneratedSignal[] {
  const count = options.count ?? ASSETS.length;
  const rand = options.seed !== undefined ? mulberry32(options.seed) : () => Math.random();
  const timeframes = ["M5", "M15", "H1"];
  const now = new Date().toISOString();
  const fixedTime = options.seed !== undefined ? "2025-01-01T12:00:00.000Z" : now;
  const signals: GeneratedSignal[] = [];

  for (let i = 0; i < Math.min(count, ASSETS.length); i++) {
    const meta = ASSETS[i]!;
    const volatility = 0.08 + rand() * 0.22;
    const trendBias = rand() > 0.5 ? 1 : -1;
    const gb = clamp(0.52 + (rand() - 0.5) * 0.35 + (0.08 - volatility * 0.25), 0.35, 0.92);
    const lstm = clamp(0.48 + trendBias * 0.15 + (rand() - 0.5) * 0.3, 0.32, 0.94);
    const probability = clamp(gb * 0.55 + lstm * 0.45, 0.4, 0.95);
    const direction: TradeDirection =
      probability >= 0.5 + (rand() - 0.5) * 0.08 ? "buy" : "sell";
    const last =
      meta.symbol.includes("XAU") || meta.symbol === "GC=F"
        ? 2650 + rand() * 80
        : meta.symbol.includes("EUR")
          ? 1.05 + rand() * 0.04
          : meta.symbol.includes("GBP")
            ? 1.25 + rand() * 0.05
            : meta.symbol === "BZ=F"
              ? 78 + rand() * 8
              : 5200 + rand() * 120;

    const pip =
      meta.decimals >= 4 ? 0.0001 : meta.decimals === 2 && last > 100 ? 0.25 : 0.05;
    const tpDist = (1.8 + rand() * 1.4) * pip * (last > 200 ? 8 : last > 10 ? 4 : 600);
    const slDist = tpDist * (0.55 + rand() * 0.2);

    const tp = direction === "buy" ? last + tpDist : last - tpDist;
    const sl = direction === "buy" ? last - slDist : last + slDist;

    const risk01 = clamp(
      0.22 + volatility * 0.55 + rand() * 0.12 + Math.abs(0.5 - probability) * 0.35,
      0.05,
      0.95
    );

    signals.push({
      id:
        options.seed !== undefined
          ? `sig_${options.seed}_${i}`
          : `sig_live_${i}_${now.slice(0, 13)}`,
      asset: meta.asset,
      symbol: meta.symbol,
      direction,
      probability: Math.round(probability * 1000) / 1000,
      tp: Math.round(tp * Math.pow(10, meta.decimals)) / Math.pow(10, meta.decimals),
      sl: Math.round(sl * Math.pow(10, meta.decimals)) / Math.pow(10, meta.decimals),
      riskScore: Math.round(risk01 * 1000) / 1000,
      confidenceLabel: confidenceLabelFrom(probability, risk01),
      ensembleGb: Math.round(gb * 1000) / 1000,
      ensembleLstm: Math.round(lstm * 1000) / 1000,
      backtestWinRate:
        Math.round(
          clamp(0.58 + (probability - 0.72) * 0.4 + (rand() - 0.5) * 0.06, 0.52, 0.84) * 1000
        ) / 1000,
      timeframe: timeframes[i % timeframes.length],
      createdAt: fixedTime,
      lastPrice: Math.round(last * Math.pow(10, meta.decimals)) / Math.pow(10, meta.decimals),
    });
  }

  return signals;
}
