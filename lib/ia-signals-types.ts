export type TradeDirection = "buy" | "sell";

export type SignalAction = "BUY" | "SELL";

export type ConfidenceLabel = "low" | "medium" | "high";

/** Motor que produziu a resposta da API (meta). */
export type SignalsEngine = "python" | "node" | "node-fallback";

export type SignalsDataSource = "yahoo" | "fallback";

export interface IASignalsEngineMeta {
  engine: SignalsEngine;
  dataSource: SignalsDataSource;
  /** True quando USE_PYTHON_BOT estava ativo (mesmo que tenha caído para Node). */
  pythonAttempted: boolean;
}

/** Canonical wire format (Node motor ou bot Python). */
export interface IASignal {
  symbol: string;
  action: SignalAction;
  probability: number;
  entry: number;
  tp: number;
  sl: number;
  timeframe: string;
  createdAt: string;
}

export interface GeneratedSignal {
  id: string;
  asset: string;
  symbol: string;
  direction: TradeDirection;
  probability: number;
  tp: number;
  sl: number;
  /** Risco agregado 0–1 (ATR, vol, RR). */
  riskScore: number;
  confidenceLabel: ConfidenceLabel;
  ensembleGb: number;
  ensembleLstm: number;
  backtestWinRate: number;
  timeframe: string;
  createdAt: string;
  lastPrice?: number;
  isFallback?: boolean;
}

/** Meta devolvida por GET /api/signals (BFF). */
export interface ApiSignalsResponseMeta extends IASignalsEngineMeta {
  tier?: string;
  yahooConnected: boolean;
}
