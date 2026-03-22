import yahooFinance from "yahoo-finance2";

const SYMBOLS = ["BZ=F", "GC=F", "ES=F", "EURUSD=X", "GBPUSD=X"] as const;

export type QuoteMap = Partial<Record<(typeof SYMBOLS)[number], number>>;

/**
 * Fetches last prices from Yahoo Finance. Fails gracefully (returns {}) for offline/tests.
 */
export async function fetchLastPrices(): Promise<QuoteMap> {
  const out: QuoteMap = {};
  try {
    const results = await Promise.all(
      SYMBOLS.map(async (sym) => {
        try {
          const q = (await yahooFinance.quote(sym)) as {
            regularMarketPrice?: number;
            postMarketPrice?: number;
            preMarketPrice?: number;
          };
          const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice;
          if (typeof price === "number" && Number.isFinite(price)) {
            return [sym, price] as const;
          }
        } catch {
          /* ignore per-symbol */
        }
        return null;
      })
    );
    for (const r of results) {
      if (r) out[r[0]] = r[1];
    }
  } catch {
    return {};
  }
  return out;
}
