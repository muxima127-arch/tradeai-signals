/**
 * Motor Node: Yahoo (import dinâmico) + ensemble de features.
 * USE_PYTHON_BOT → /api/python/signals; falha → node-fallback + Yahoo/fallback.
 */

import {
  actionFromScore,
  averageTrueRange,
  clamp,
  confidenceLabelFrom,
  ensembleScoreFromBars,
  probabilityFromScore,
  riskScore01,
  rangeVolatilityNorm,
} from "@/lib/signal-features";
import type {
  ConfidenceLabel,
  GeneratedSignal,
  IASignal,
  IASignalsEngineMeta,
  SignalAction,
  TradeDirection,
} from "@/lib/ia-signals-types";

export type {
  ConfidenceLabel,
  GeneratedSignal,
  IASignal,
  IASignalsEngineMeta,
  TradeDirection,
} from "@/lib/ia-signals-types";

const ASSETS: { asset: string; symbol: string; decimals: number }[] = [
  { asset: "Brent Crude", symbol: "BZ=F", decimals: 2 },
  { asset: "Gold", symbol: "GC=F", decimals: 2 },
  { asset: "S&P 500", symbol: "ES=F", decimals: 2 },
  { asset: "EUR/USD", symbol: "EURUSD=X", decimals: 5 },
  { asset: "GBP/USD", symbol: "GBPUSD=X", decimals: 5 },
];

const CACHE_TTL_MS = Math.max(
  15_000,
  Math.min(120_000, Number(process.env.MARKET_DATA_CACHE_TTL_MS) || 45_000)
);

type CacheEntry = { t: number; signals: GeneratedSignal[] };
let cacheStore: CacheEntry | null = null;

/** Testes: limpa cache entre runs. */
export function __resetSignalCacheForTests(): void {
  cacheStore = null;
}

function roundPrice(p: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(p * f) / f;
}

function mapIASignalToGenerated(
  ias: IASignal,
  meta: { asset: string; decimals: number },
  features: {
    gb: number;
    lstm: number;
    riskScore: number;
    confidenceLabel: ConfidenceLabel;
  }
): GeneratedSignal {
  const direction: TradeDirection = ias.action === "BUY" ? "buy" : "sell";
  return {
    id: `${ias.symbol}-${ias.createdAt}`,
    asset: meta.asset,
    symbol: ias.symbol,
    isFallback: false,
    direction,
    probability: roundPrice(ias.probability, 3),
    tp: roundPrice(ias.tp, meta.decimals),
    sl: roundPrice(ias.sl, meta.decimals),
    riskScore: roundPrice(features.riskScore, 3),
    confidenceLabel: features.confidenceLabel,
    ensembleGb: roundPrice(features.gb, 3),
    ensembleLstm: roundPrice(features.lstm, 3),
    backtestWinRate: clamp(0.52 + (ias.probability - 0.5) * 0.55, 0.5, 0.88),
    timeframe: ias.timeframe,
    createdAt: ias.createdAt,
    lastPrice: roundPrice(ias.entry, meta.decimals),
  };
}

function barsToIASignal(
  symbol: string,
  bars: { close: number; high: number; low: number }[]
): {
  ias: IASignal;
  gb: number;
  lstm: number;
  riskScore: number;
  confidenceLabel: ConfidenceLabel;
} | null {
  if (bars.length < 40) return null;
  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const ens = ensembleScoreFromBars(closes, highs, lows);
  if (!ens) return null;

  const score = ens.score;
  const action = actionFromScore(score);
  const prob = probabilityFromScore(Math.abs(score));

  const atr = averageTrueRange(highs, lows, closes, 14) ?? Math.abs(closes.at(-1)! - closes.at(-2)!) * 2;
  const entry = closes.at(-1)!;
  const rr = 1.8;
  const slDist = clamp(atr * 1.1, entry * 0.0008, entry * 0.04);
  const tpDist = slDist * rr;

  let tp: number;
  let sl: number;
  if (action === "BUY") {
    tp = entry + tpDist;
    sl = entry - slDist;
  } else {
    tp = entry - tpDist;
    sl = entry + slDist;
  }

  const rv = rangeVolatilityNorm(highs, lows, closes, 5);
  const risk01 = riskScore01({
    atrOverPrice: atr / entry,
    rangeVolNorm: rv,
    rewardRisk: tpDist / slDist,
  });
  const confidenceLabel = confidenceLabelFrom(prob, risk01);

  const ias: IASignal = {
    symbol,
    action,
    probability: prob,
    entry,
    tp,
    sl,
    timeframe: "1D",
    createdAt: new Date().toISOString(),
  };

  return {
    ias,
    gb: ens.gb,
    lstm: ens.lstm,
    riskScore: risk01,
    confidenceLabel,
  };
}

async function runNodeMotorWithMeta(limit: number): Promise<{
  signals: GeneratedSignal[];
  usedFallback: boolean;
}> {
  const now = Date.now();
  if (cacheStore && now - cacheStore.t < CACHE_TTL_MS) {
    const cached = cacheStore.signals.slice(0, limit);
    const usedFallback = cached.some((s) => s.isFallback);
    return { signals: cached, usedFallback };
  }

  const { fetchDailyBars } = await import("@/lib/market-data");
  const out: GeneratedSignal[] = [];

  for (const meta of ASSETS_SLICE(limit)) {
    const bars = await fetchDailyBars(meta.symbol);
    const computed = barsToIASignal(meta.symbol, bars);
    if (computed) {
      out.push(
        mapIASignalToGenerated(computed.ias, meta, {
          gb: computed.gb,
          lstm: computed.lstm,
          riskScore: computed.riskScore,
          confidenceLabel: computed.confidenceLabel,
        })
      );
    }
  }

  let usedFallback = false;
  if (out.length === 0) {
    usedFallback = true;
    for (const meta of ASSETS.slice(0, limit)) {
      out.push(fallbackSynthetic(meta));
    }
  }

  cacheStore = { t: now, signals: out };
  return { signals: out.slice(0, limit), usedFallback };
}

function ASSETS_SLICE(n: number) {
  return ASSETS.slice(0, Math.min(n, ASSETS.length));
}

function fallbackSynthetic(meta: (typeof ASSETS)[number]): GeneratedSignal {
  const now = new Date().toISOString();
  const base =
    meta.symbol === "GC=F"
      ? 2650
      : meta.symbol === "EURUSD=X"
        ? 1.08
        : meta.symbol === "GBPUSD=X"
          ? 1.27
          : meta.symbol === "BZ=F"
            ? 80
            : 5300;
  const prob = 0.55;
  const risk01 = 0.48;
  const ias: IASignal = {
    symbol: meta.symbol,
    action: "BUY",
    probability: prob,
    entry: base,
    tp: base * 1.004,
    sl: base * 0.996,
    timeframe: "1D",
    createdAt: now,
  };
  const g = mapIASignalToGenerated(ias, meta, {
    gb: 0.55,
    lstm: 0.52,
    riskScore: risk01,
    confidenceLabel: confidenceLabelFrom(prob, risk01),
  });
  return { ...g, isFallback: true };
}

async function fetchPythonSignalsAsGenerated(): Promise<GeneratedSignal[] | null> {
  const base =
    process.env.INTERNAL_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://127.0.0.1:3000";

  const url = `${base.replace(/\/$/, "")}/api/python/signals`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { signals?: unknown[] };
    if (!json.signals?.length) return null;
    return json.signals.map((raw) => mapPythonRowToGenerated(raw));
  } catch {
    return null;
  }
}

function parseSignalAction(o: Record<string, unknown>): SignalAction {
  const raw = o.action ?? o.direction;
  const u = String(raw ?? "BUY").toUpperCase();
  if (u === "SELL" || u === "SHORT") return "SELL";
  return "BUY";
}

function mapPythonRowToGenerated(row: unknown): GeneratedSignal {
  const o = row as Record<string, unknown>;
  const symbol = String(o.symbol ?? "");
  const meta = ASSETS.find((a) => a.symbol === symbol) ?? {
    asset: symbol,
    symbol,
    decimals: 4,
  };
  const action = parseSignalAction(o);
  const prob = clamp(Number(o.probability) || 0.5, 0, 1);
  const entry = Number(o.entry ?? o.lastPrice) || 0;
  const riskRaw = o.riskScore;
  const risk01 =
    typeof riskRaw === "number" && riskRaw <= 1 && riskRaw >= 0
      ? riskRaw
      : clamp((Number(riskRaw) || 45) / 100, 0, 1);
  const confRaw = o.confidenceLabel;
  const confidenceLabel: ConfidenceLabel =
    confRaw === "high" || confRaw === "medium" || confRaw === "low"
      ? confRaw
      : confidenceLabelFrom(prob, risk01);

  const ias: IASignal = {
    symbol: meta.symbol,
    action,
    probability: prob,
    entry,
    tp: Number(o.tp) || entry,
    sl: Number(o.sl) || entry,
    timeframe: String(o.timeframe ?? "1D"),
    createdAt: String(o.createdAt ?? new Date().toISOString()),
  };

  const gb = typeof o.ensembleGb === "number" ? o.ensembleGb : clamp(prob + 0.05, 0.2, 0.95);
  const lstm = typeof o.ensembleLstm === "number" ? o.ensembleLstm : clamp(prob - 0.02, 0.2, 0.95);

  const g = mapIASignalToGenerated(ias, meta, {
    gb,
    lstm,
    riskScore: risk01,
    confidenceLabel,
  });
  const isFb = o.isFallback === true;
  return { ...g, isFallback: isFb };
}

export interface GetIASignalsOptions {
  limit?: number;
}

export async function getIASignalsResult(
  options: GetIASignalsOptions = {}
): Promise<{ signals: GeneratedSignal[]; meta: IASignalsEngineMeta }> {
  const limit = options.limit ?? 5;
  const pythonOn = process.env.USE_PYTHON_BOT === "true";

  if (pythonOn) {
    const py = await fetchPythonSignalsAsGenerated();
    if (py?.length) {
      return {
        signals: py.slice(0, limit),
        meta: { engine: "python", dataSource: "yahoo", pythonAttempted: true },
      };
    }
    const { signals, usedFallback } = await runNodeMotorWithMeta(limit);
    return {
      signals,
      meta: {
        engine: "node-fallback",
        dataSource: usedFallback ? "fallback" : "yahoo",
        pythonAttempted: true,
      },
    };
  }

  const { signals, usedFallback } = await runNodeMotorWithMeta(limit);
  return {
    signals,
    meta: {
      engine: "node",
      dataSource: usedFallback ? "fallback" : "yahoo",
      pythonAttempted: false,
    },
  };
}

export async function getIASignals(options: GetIASignalsOptions = {}): Promise<GeneratedSignal[]> {
  return (await getIASignalsResult(options)).signals;
}

export function signalToJsonRow(
  s: GeneratedSignal,
  userId: string | null
): Record<string, unknown> {
  return {
    user_id: userId,
    asset: s.asset,
    symbol: s.symbol,
    direction: s.direction,
    probability: s.probability,
    tp: s.tp,
    sl: s.sl,
    risk_score: s.riskScore,
    ensemble_gb: s.ensembleGb,
    ensemble_lstm: s.ensembleLstm,
    backtest_win_rate: s.backtestWinRate,
    timeframe: s.timeframe,
    meta: {
      lastPrice: s.lastPrice,
      confidenceLabel: s.confidenceLabel,
      isFallback: s.isFallback,
    },
  };
}
