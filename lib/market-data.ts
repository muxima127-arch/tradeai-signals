import yahooFinance from "yahoo-finance2";

export interface OhlcBar {
  t: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const DEFAULT_PERIOD_MS = 120 * 24 * 60 * 60 * 1000;

/**
 * Historical daily bars from Yahoo Finance (no API key).
 * Returns empty array on failure so callers can fall back.
 */
export async function fetchDailyBars(symbol: string): Promise<OhlcBar[]> {
  try {
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - DEFAULT_PERIOD_MS);
    const chart = (await yahooFinance.chart(symbol, {
      period1,
      period2,
      interval: "1d",
    })) as { quotes?: Array<{
      date?: Date | string | number;
      open?: number | null;
      high?: number | null;
      low?: number | null;
      close?: number | null;
      volume?: number | null;
    }> };

    const q = chart.quotes;
    if (!q?.length) return [];

    const bars: OhlcBar[] = [];
    for (const row of q) {
      if (
        row.date == null ||
        row.open == null ||
        row.high == null ||
        row.low == null ||
        row.close == null
      ) {
        continue;
      }
      bars.push({
        t: new Date(row.date),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume ?? undefined,
      });
    }
    return bars;
  } catch {
    return [];
  }
}
