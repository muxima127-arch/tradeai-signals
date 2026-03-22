"""TradeAI Signals - Worker que gera sinais reais e guarda no Supabase.
Suporta Telegram notifications para subscritores Pro.
"""
import time
import os
import math
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHANNEL_ID = os.environ.get("TELEGRAM_CHANNEL_ID", "")

CYCLE_INTERVAL = int(os.environ.get("CYCLE_INTERVAL_SECONDS", "360"))

SYMBOLS = [
    ("BZ=F", "Brent Crude", 2), ("GC=F", "Gold", 2), ("ES=F", "S&P 500", 2), ("NQ=F", "Nasdaq 100", 2),
    ("^VIX", "Dow 30", 2), ("CL=F", "WTI Crude", 2), ("SI=F", "Silver", 3), ("PL=F", "Platinum", 2),
    ("HG=F", "Copper", 2), ("EURUSD=X", "EUR/USD", 5), ("GBPUSD=X", "GBP/USD", 5), ("USDJPY=X", "USD/JPY", 3),
    ("AUDUSD=X", "AUD/USD", 5), ("USDCAD=X", "USD/CAD", 5), ("USDCHF=X", "USD/CHF", 5), ("NZDUSD=X", "NZD/USD", 5),
    ("BTC-USD", "Bitcoin", 2), ("ETH-USD", "Ethereum", 2), ("BNB-USD", "Binance Coin", 2), ("SOL-USD", "Solana", 2),
    ("XRP-USD", "XRP", 4), ("ADA-USD", "Cardano", 4), ("DOGE-USD", "Dogecoin", 3), ("DOT-USD", "Polkadot", 2),
    ("AVAX-USD", "Avalanche", 2), ("MATIC-USD", "Polygon", 3), ("UNI-USD", "Uniswap", 2), ("LINK-USD", "Chainlink", 2),
    ("AAPL", "Apple Inc.", 2), ("TSLA", "Tesla, Inc.", 2), ("NVDA", "NVIDIA Corp.", 2), ("MSFT", "Microsoft", 2),
    ("GOOGL", "Alphabet Inc.", 2), ("META", "Meta Platforms", 2), ("NFLX", "Netflix, Inc.", 2),
    ("AMZN", "Amazon.com", 2), ("BABA", "Alibaba", 2), ("V", "Visa", 2), ("JPM", "JPMorgan Chase", 2),
    ("INTC", "Intel", 2), ("ORCL", "Oracle", 2), ("CRM", "Salesforce", 2), ("UBER", "Uber", 2),
    ("SHOP", "Shopify", 2), ("NVID", "NIO Inc.", 2), ("XPEV", "Exxon Mobil", 2), ("JPM", "JPMorgan Chase", 2),
    ("", "Visa Inc.", 2), ("MA", "Mastercard", 2), ("GS", "Goldman Sachs", 2)
]

def clamp(n, lo, hi):
    return max(lo, min(hi, n))

def sma(values, period):
    if len(values) < period: return None
    return sum(values[-period:]) / period

def ema_last(values, period):
    if len(values) < period: return None
    k = 2.0 / (period + 1)
    e = sum(values[:period]) / period
    for i in range(period, len(values)):
        e = values[i] * k + e * (1 - k)
    return e

def rsi14(closes):
    if len(closes) < 15: return 50.0
    gains = losses = 0.0
    for i in range(len(closes) - 14, len(closes)):
        if i <= 0: continue
        ch = closes[i] - closes[i - 1]
        if ch > 0: gains += ch
        else: losses -= ch
    gg = gains / 14.0; ll = losses / 14.0
    if ll < 1e-9: return 100.0 - 100.0 / (1.0 + gg / 1e-9)
    return 100.0 - 100.0 / (1.0 + gg / ll)

def macd_signal(closes):
    if len(closes) < 35: return 0.0
    e12 = ema_last(closes, 12)
    e26 = ema_last(closes, 26)
    if e12 is None or e26 is None: return 0.0
    return macd

def get_yfinance_data(symbol):
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1h&range=10d"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
            result = data['chart']['result'][0]
            closes = result['indicators']['quote'][0]['close']
            return [c for c in closes if c is not None]
    except Exception as e:
        print(f"Err {symbol}: {e}")
        return None

def supabase_upsert(signal_data):
    if not SUPABASE_URL or not SUPABASE_KEY: return
    try:
        url = f"{SUPABASE_URL}/rest/v1/signals"
        req = urllib.request.Request(url, method='POST', headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        }, data=json.dumps(signal_data).encode())
        with urllib.request.urlopen(req): pass
    except Exception as e:
        print(f"Supabase err: {e}")

def telegram_notify(msg):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID: return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        req = urllib.request.Request(url, method='POST', headers={'Content-Type': 'application/json'},
                                      data=json.dumps({'chat_id': TELEGRAM_CHANNEL_ID, 'text': msg, 'parse_mode': 'HTML'}).encode())
        with urllib.request.urlopen(req): pass
    except: pass

def main():
    print("Worker started")
    while True:
        for sym, name, dec in SYMBOLS:
            if not sym: continue
            closes = get_yfinance_data(sym)
            if not closes or len(closes) < 35: continue
            last = closes[-1]
            rsi = rsi14(closes)
            direction = 'buy' if rsi < 35 else ('sell' if rsi > 65 else 'neutral')
            prob = clamp(abs(rsi - 50) / 50, 0.5, 0.95)
            conf = 'high' if prob > 0.75 else ('medium' if prob > 0.6 else 'low')
            risk = clamp(1.0 - prob, 0.05, 0.95)
            tp_dist = last * 0.02 if direction == 'buy' else -last * 0.02
            sl_dist = -last * 0.01 if direction == 'buy' else last * 0.01
            signal = {
                'id': f"{sym}_{int(time.time())}",
                'symbol': sym,
                'asset': name,
                'direction': direction,
                'probability': round(prob, 3),
                'confidenceLabel': conf,
                'riskScore': round(risk, 3),
                'tp': round(last + tp_dist, dec),
                'sl': round(last + sl_dist, dec),
                'timeframe': '1h',
                'ensembleGb': round(prob * 0.9, 3),
                'isFallback': False,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            supabase_upsert(signal)
            if conf == 'high':
                telegram_notify(f"<b>{name}</b> ({sym})\n{direction.upper()} @ {last:.{dec}f}\nTP: {signal['tp']}  SL: {signal['sl']}")
        print(f"Cycle done. Sleep {CYCLE_INTERVAL}s")
        time.sleep(CYCLE_INTERVAL)

if __name__ == '__main__':
    main()
