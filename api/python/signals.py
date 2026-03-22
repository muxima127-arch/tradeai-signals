"""
Motor Python opcional — mesmo contrato JSON que o Node (`GeneratedSignal` via BFF).
GET /api/python/signals
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="TradeAI Python signals", version="2.0.0")

SYMBOLS: list[tuple[str, str, int]] = [
    ("BZ=F", "Brent Crude", 2),
    ("GC=F", "Gold", 2),
    ("ES=F", "S&P 500", 2),
    ("EURUSD=X", "EUR/USD", 5),
    ("GBPUSD=X", "GBP/USD", 5),
]


def clamp(n: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, n))


def sma(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    return sum(values[-period:]) / period


def std_dev(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = sum(values) / len(values)
    v = sum((x - m) ** 2 for x in values) / len(values)
    return math.sqrt(v)


def ema_last(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    k = 2.0 / (period + 1)
    e = sum(values[:period]) / period
    for i in range(period, len(values)):
        e = values[i] * k + e * (1 - k)
    return e


def log_returns(closes: list[float]) -> list[float]:
    out: list[float] = []
    for i in range(1, len(closes)):
        a, b = closes[i - 1], closes[i]
        if a > 0 and b > 0:
            out.append(math.log(b / a))
    return out


def rsi14(closes: list[float]) -> float | None:
    if len(closes) < 15:
        return None
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
    rs = ag / al
    return 100.0 - 100.0 / (1.0 + rs)


def score_from_series(closes: list[float]) -> dict[str, float] | None:
    if len(closes) < 25:
        return None
    sma20 = sma(closes, 20)
    if sma20 is None or sma20 == 0:
        return None
    last = closes[-1]
    momentum = (last - sma20) / sma20
    rsi = rsi14(closes)
    rsi_norm = 0.0 if rsi is None else (rsi - 50.0) / 50.0
    lr = log_returns(closes)
    vol = std_dev(lr[-20:]) if len(lr) >= 20 else 0.0
    vol_penalty = clamp(vol * 25.0, 0.0, 0.35)
    score = clamp(momentum * 40.0, -0.55, 0.55) * 0.55 + rsi_norm * 0.35 - vol_penalty * 0.25
    return {"momentum": momentum, "rsi_norm": rsi_norm, "vol_penalty": vol_penalty, "score": clamp(score, -1.0, 1.0)}


def macd_last(closes: list[float]) -> tuple[float, float, float] | None:
    if len(closes) < 35:
        return None
    e12 = ema_last(closes, 12)
    e26 = ema_last(closes, 26)
    if e12 is None or e26 is None:
        return None
    macd = e12 - e26
    macd_recent: list[float] = []
    for j in range(26, len(closes)):
        sl = closes[: j + 1]
        a = ema_last(sl, 12)
        b = ema_last(sl, 26)
        if a is not None and b is not None:
            macd_recent.append(a - b)
    if not macd_recent:
        return None
    sig = ema_last(macd_recent, 9) if len(macd_recent) >= 9 else macd_recent[-1]
    return macd, sig, macd - sig


def bollinger_position(closes: list[float], period: int = 20, std_mult: float = 2.0) -> float | None:
    if len(closes) < period:
        return None
    mid = sma(closes, period)
    if mid is None:
        return None
    sl = closes[-period:]
    sd = std_dev(sl)
    if sd == 0:
        return 0.0
    last = closes[-1]
    upper = mid + std_mult * sd
    lower = mid - std_mult * sd
    pos = (last - lower) / (upper - lower) - 0.5
    return clamp(pos * 2.0, -1.0, 1.0)


def range_vol_norm(highs: list[float], lows: list[float], closes: list[float], lookback: int = 5) -> float:
    if len(highs) < lookback:
        return 0.0
    s = 0.0
    for i in range(len(highs) - lookback, len(highs)):
        c = closes[i]
        if c > 0:
            s += (highs[i] - lows[i]) / c
    return clamp(s / lookback, 0.0, 0.15)


def atr14(highs: list[float], lows: list[float], closes: list[float]) -> float | None:
    if len(highs) < 15:
        return None
    trs: list[float] = []
    for i in range(len(highs) - 14, len(highs)):
        h, l, pc = highs[i], lows[i], closes[i - 1]
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    return sum(trs) / len(trs)


def ensemble_score(
    closes: list[float], highs: list[float], lows: list[float]
) -> dict[str, float] | None:
    if len(closes) < 40:
        return None
    base = score_from_series(closes)
    if base is None:
        return None
    macd = macd_last(closes)
    last = closes[-1]
    macd_hist_norm = 0.0
    if macd is not None and last > 0:
        macd_hist_norm = clamp(math.tanh((macd[2] / last) * 800), -1.0, 1.0)
    boll = bollinger_position(closes) or 0.0
    e12 = ema_last(closes, 12)
    e26 = ema_last(closes, 26)
    ema_trend = 0.0
    if e12 is not None and e26 is not None and last > 0:
        ema_trend = clamp(((e12 - e26) / last) * 50.0, -0.4, 0.4)
    rv = range_vol_norm(highs, lows, closes, 5)
    vol_adj = clamp(rv * 8.0, 0.0, 0.12)
    score = (
        base["score"] * 0.38
        + macd_hist_norm * 0.22
        + boll * 0.18
        + ema_trend * 0.22
        - vol_adj * 0.15
    )
    score = clamp(score, -1.0, 1.0)
    gb = clamp(0.5 + base["momentum"] * 15 + macd_hist_norm * 0.22, 0.15, 0.95)
    lstm = clamp(0.5 + base["rsi_norm"] * 0.35 + boll * 0.2 + ema_trend * 0.25, 0.15, 0.95)
    return {"score": score, "gb": gb, "lstm": lstm}


def prob_from_score(abs_score: float) -> float:
    return clamp(0.4 + abs_score * 0.5, 0.32, 0.94)


def risk_score01(atr: float, entry: float, rv: float, tp_dist: float, sl_dist: float) -> float:
    atr_r = clamp((atr / entry) * 35.0, 0.0, 0.42)
    vol_r = clamp(rv * 4.0, 0.0, 0.38)
    rr = tp_dist / sl_dist if sl_dist > 0 else 1.8
    rr_pen = 0.2 if rr < 1.2 else (0.06 if rr > 2.8 else 0.14)
    return clamp(atr_r * 0.42 + vol_r * 0.38 + rr_pen * 0.2, 0.0, 1.0)


def confidence_label(prob: float, risk01: float) -> str:
    conf = prob * (1 - risk01 * 0.55)
    if conf >= 0.58:
        return "high"
    if conf >= 0.38:
        return "medium"
    return "low"


def round_price(p: float, decimals: int) -> float:
    f = 10**decimals
    return round(p * f) / f


def fetch_data(sym: str) -> Any | None:
    try:
        import yfinance as yf

        t = yf.Ticker(sym)
        return t.history(period="6mo", interval="1d", auto_adjust=True)
    except Exception:
        return None


def build_features(hist: Any) -> tuple[list[float], list[float], list[float]] | None:
    if hist is None or hist.empty or len(hist) < 40:
        return None
    closes = [float(x) for x in hist["Close"].tolist()]
    highs = [float(x) for x in hist["High"].tolist()]
    lows = [float(x) for x in hist["Low"].tolist()]
    return closes, highs, lows


def generate_signal_row(sym: str, name: str, decimals: int) -> dict[str, Any] | None:
    hist = fetch_data(sym)
    packed = build_features(hist)
    if packed is None:
        return None
    closes, highs, lows = packed
    ens = ensemble_score(closes, highs, lows)
    if ens is None:
        return None
    score = ens["score"]
    action = "BUY" if score >= 0 else "SELL"
    prob = prob_from_score(abs(score))
    entry = closes[-1]
    atr = atr14(highs, lows, closes)
    if atr is None:
        atr = abs(closes[-1] - closes[-2]) * 2
    sl_dist = clamp(atr * 1.1, entry * 0.0008, entry * 0.04)
    tp_dist = sl_dist * 1.8
    rv = range_vol_norm(highs, lows, closes, 5)
    r01 = risk_score01(atr, entry, rv, tp_dist, sl_dist)
    conf = confidence_label(prob, r01)
    if action == "BUY":
        tp, sl = entry + tp_dist, entry - sl_dist
    else:
        tp, sl = entry - tp_dist, entry + sl_dist
    bt = clamp(0.52 + (prob - 0.5) * 0.55, 0.5, 0.88)
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "id": f"{sym}-{now}",
        "asset": name,
        "symbol": sym,
        "direction": "buy" if action == "BUY" else "sell",
        "probability": round_price(prob, 3),
        "tp": round_price(tp, decimals),
        "sl": round_price(sl, decimals),
        "riskScore": round_price(r01, 3),
        "confidenceLabel": conf,
        "ensembleGb": round_price(ens["gb"], 3),
        "ensembleLstm": round_price(ens["lstm"], 3),
        "backtestWinRate": round(bt, 3),
        "timeframe": "1D",
        "createdAt": now,
        "lastPrice": round_price(entry, decimals),
        "isFallback": False,
    }


def fallback_row(sym: str, name: str, decimals: int) -> dict[str, Any]:
    base = {"GC=F": 2650.0, "EURUSD=X": 1.08, "GBPUSD=X": 1.27, "BZ=F": 80.0}.get(sym, 5300.0)
    prob = 0.55
    r01 = 0.48
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "id": f"{sym}-fb-{now}",
        "asset": name,
        "symbol": sym,
        "direction": "buy",
        "probability": prob,
        "tp": round_price(base * 1.004, decimals),
        "sl": round_price(base * 0.996, decimals),
        "riskScore": r01,
        "confidenceLabel": confidence_label(prob, r01),
        "ensembleGb": 0.55,
        "ensembleLstm": 0.52,
        "backtestWinRate": 0.62,
        "timeframe": "1D",
        "createdAt": now,
        "lastPrice": round_price(base, decimals),
        "isFallback": True,
    }


@app.get("/")
def signals() -> JSONResponse:
    out: list[dict[str, Any]] = []
    for sym, name, dec in SYMBOLS:
        row = generate_signal_row(sym, name, dec)
        if row:
            out.append(row)
    if not out:
        for sym, name, dec in SYMBOLS[:5]:
            out.append(fallback_row(sym, name, dec))
    return JSONResponse({"signals": out})
