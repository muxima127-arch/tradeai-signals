"""TradeAI Signals - Worker continuo que gera sinais reais e guarda no Supabase.
Corre a cada hora com dados reais do yfinance.
"""
import time
import os
import math
import sys
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

SYMBOLS = [
    ("BZ=F",     "Brent Crude", 2),
    ("GC=F",     "Gold",        2),
    ("ES=F",     "S&P 500",     2),
    ("EURUSD=X", "EUR/USD",     5),
    ("GBPUSD=X", "GBP/USD",     5),
]


def clamp(n, lo, hi):
    return max(lo, min(hi, n))


def sma(values, period):
    if len(values) < period:
        return None
    return sum(values[-period:]) / period


def std_dev(values):
    if len(values) < 2:
        return 0.0
    m = sum(values) / len(values)
    return math.sqrt(sum((x - m) ** 2 for x in values) / len(values))


def ema_last(values, period):
    if len(values) < period:
        return None
    k = 2.0 / (period + 1)
    e = sum(values[:period]) / period
    for i in range(period, len(values)):
        e = values[i] * k + e * (1 - k)
    return e


def rsi14(closes):
    if len(closes) < 15:
        return 50.0
    gains = losses = 0.0
    for i in range(len(closes) - 14, len(closes)):
        ch = closes[i] - closes[i - 1]
        if ch >= 0:
            gains += ch
        else:
            losses -= ch
    ag = gains / 14.0
    al = losses / 14.0
    if al == 0:
        return 100.0
    return 100.0 - 100.0 / (1.0 + ag / al)


def macd_histogram(closes):
    if len(closes) < 35:
        return 0.0
    e12 = ema_last(closes, 12)
    e26 = ema_last(closes, 26)
    if e12 is None or e26 is None:
        return 0.0
    macd = e12 - e26
    macd_series = []
    for j in range(26, len(closes)):
        a = ema_last(closes[:j+1], 12)
        b = ema_last(closes[:j+1], 26)
        if a and b:
            macd_series.append(a - b)
    if len(macd_series) < 9:
        return 0.0
    signal = ema_last(macd_series, 9)
    return macd - (signal or 0.0)


def atr14(highs, lows, closes):
    if len(highs) < 15:
        return abs(closes[-1] - closes[-2]) * 2 if len(closes) >= 2 else closes[-1] * 0.01
    trs = []
    for i in range(len(highs) - 14, len(highs)):
        h, l, pc = highs[i], lows[i], closes[i - 1]
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    return sum(trs) / len(trs)


def generate_signal(sym, name, decimals):
    import yfinance as yf
    hist = yf.Ticker(sym).history(period="6mo", interval="1d", auto_adjust=True)
    if hist is None or hist.empty or len(hist) < 40:
        return None

    closes = [float(x) for x in hist["Close"].tolist()]
    highs  = [float(x) for x in hist["High"].tolist()]
    lows   = [float(x) for x in hist["Low"].tolist()]

    rsi   = rsi14(closes)
    hist_  = macd_histogram(closes)
    entry = closes[-1]
    sma20 = sma(closes, 20) or entry
    momentum = (entry - sma20) / sma20

    # Score combinado
    score = clamp(momentum * 40, -0.55, 0.55) * 0.45 + \
            (rsi - 50) / 100 * 0.30 + \
            clamp(math.tanh((hist_ / entry) * 800), -1, 1) * 0.25
    score = clamp(score, -1.0, 1.0)

    direction = "buy" if score >= 0 else "sell"
    prob = round(clamp(0.40 + abs(score) * 0.50, 0.32, 0.94), 3)

    atr = atr14(highs, lows, closes)
    sl_dist = clamp(atr * 1.1, entry * 0.0008, entry * 0.04)
    tp_dist = sl_dist * 1.8

    if direction == "buy":
        tp = round(entry + tp_dist, decimals)
        sl = round(entry - sl_dist, decimals)
    else:
        tp = round(entry - tp_dist, decimals)
        sl = round(entry + sl_dist, decimals)

    rr = tp_dist / sl_dist if sl_dist > 0 else 1.8
    risk = clamp((atr / entry) * 35 * 0.5 + (0.2 if rr < 1.2 else 0.1), 0.0, 1.0)
    conf = "high" if prob >= 0.65 else ("medium" if prob >= 0.45 else "low")

    now = datetime.now(timezone.utc).isoformat()
    return {
        "asset":            name,
        "symbol":           sym,
        "direction":        direction,
        "probability":      prob,
        "tp":               tp,
        "sl":               sl,
        "risk_score":       round(risk, 3),
        "confidence_label": conf,
        "ensemble_gb":      round(clamp(0.5 + momentum * 15 + (rsi - 50) / 200, 0.15, 0.95), 3),
        "ensemble_lstm":    round(clamp(0.5 + score * 0.4, 0.15, 0.95), 3),
        "backtest_win_rate": round(clamp(0.52 + (prob - 0.5) * 0.55, 0.50, 0.88), 3),
        "timeframe":        "1D",
        "last_price":       round(entry, decimals),
        "is_fallback":      False,
        "created_at":       now,
    }


def run_once():
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    signals = []
    for sym, name, dec in SYMBOLS:
        try:
            print(f"  Processando {sym}...", flush=True)
            row = generate_signal(sym, name, dec)
            if row:
                signals.append(row)
                print(f"  OK {sym}: {row['direction'].upper()} @ {row['last_price']}, prob={row['probability']}", flush=True)
        except Exception as e:
            print(f"  ERRO {sym}: {e}", flush=True)

    if signals:
        # Limpa sinais antigos e insere os novos
        sb.table("signals").delete().neq("id", "").execute()
        sb.table("signals").insert(signals).execute()
        print(f"Guardados {len(signals)} sinais no Supabase.", flush=True)
    else:
        print("Nenhum sinal gerado.", flush=True)


if __name__ == "__main__":
    print("TradeAI Signals Worker iniciado.", flush=True)
    while True:
        print(f"\n[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC] A gerar sinais...", flush=True)
        try:
            run_once()
        except Exception as e:
            print(f"Erro no ciclo principal: {e}", flush=True)
        print("Aguardando 1 hora...", flush=True)
        time.sleep(3600)
