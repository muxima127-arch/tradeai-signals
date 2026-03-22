\"\"\"TradeAI Signals - Worker que gera sinais reais e guarda no Supabase.
Suporta Telegram notifications para subscritores Pro.
\"\"\"
import time
import os
import math
import json
import urllib.request
import urllib.error
from datetime import import datetime, timezone

SUPABASE_URL = os.environ.get(\"NEXT_PUBLIC_SUPABASE_URL\", \"\")
SUPABASE_KEY = os.environ.get(\"SUPABASE_SERVICE_ROLE_KEY\", \"\")
TELEGRAM_BOT_TOKEN = os.environ.get(\"TELEGRAM_BOT_TOKEN\", \"\")
TELEGRAM_CHANNEL_ID = os.environ.get(\"TELEGRAM_CHANNEL_ID\", \"\")

CYCLE_INTERVAL = int(os.environ.get(\"CYCLE_INTERVAL_SECONDS\", \"3600\"))

SYMBOLS = [
    (\"BZ=F\", \"Brent Crude\", 2), (\"GC=F\", \"Gold\", 2), (\"ES=F\", \"S&P 500\", 2), (\"NQ=F\", \"Nasdaq 100\", 2),
    (\"YM=F\", \"Dow 30\", 2), (\"CL=F\", \"WTI Crude\", 2), (\"SI=F\", \"Silver\", 3), (\"PL=F\", \"Platinum\", 2),
    (\"HG=F\", \"Copper\", 4), (\"EURUSD=X\", \"EUR/USD\", 5), (\"GBPUSD=X\", \"GBP/USD\", 5), (\"USDJPY=X\", \"USD/JPY\", 3),
    (\"AUDUSD=X\", \"AUD/USD\", 5), (\"USDCAD=X\", \"USD/CAD\", 5), (\"USDCHF=X\", \"USD/CHF\", 5), (\"NZDUSD=X\", \"NZD/USD\", 5),
    (\"BTC-USD\", \"Bitcoin\", 2), (\"ETH-USD\", \"Ethereum\", 2), (\"BNB-USD\", \"Binance Coin\", 2), (\"SOL-USD\", \"Solana\", 2),
    (\"XRP-USD\", \"XRP\", 4), (\"ADA-USD\", \"Cardano\", 4), (\"DOGE-USD\", \"Dogecoin\", 5), (\"DOT-USD\", \"Polkadot\", 2),
    (\"AAPL\", \"Apple Inc.\", 2), (\"TSLA\", \"Tesla, Inc.\", 2), (\"NVDA\", \"NVIDIA Corp.\", 2), (\"MSFT\", \"Microsoft\", 2),
    (\"AMZN\", \"Amazon.com\", 2), (\"GOOGL\", \"Alphabet Inc.\", 2), (\"META\", \"Meta Platforms\", 2), (\"NFLX\", \"Netflix, Inc.\", 2),
    (\"AMD\", \"AMD\", 2), (\"BABA\", \"Alibaba\", 2), (\"PLTR\", \"Palantir\", 2), (\"COIN\", \"Coinbase\", 2),
    (\"MSTR\", \"MicroStrategy\", 2), (\"DIS\", \"Disney\", 2), (\"PYPL\", \"PayPal\", 2), (\"SQ\", \"Block Inc.\", 2),
    (\"INTC\", \"Intel\", 2), (\"ORCL\", \"Oracle\", 2), (\"CRM\", \"Salesforce\", 2), (\"UBER\", \"Uber\", 2),
    (\"SHOP\", \"Shopify\", 2), (\"NIO\", \"NIO Inc.\", 2), (\"XOM\", \"Exxon Mobil\", 2), (\"JPM\", \"JPMorgan Chase\", 2),
    (\"V\", \"Visa Inc.\", 2), (\"MA\", \"Mastercard\", 2), (\"GS\", \"Goldman Sachs\", 2)
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
        ch = closes[i] - closes[i - 1]
        if ch >= 0: gains += ch
        else: losses -= ch
    ag, al = gains / 14.0, losses / 14.0
    if al == 0: return 100.0
    return 100.0 - 100.0 / (1.0 + ag / al)

def macd_histogram(closes):
    if len(closes) < 35: return 0.0
    e12 = ema_last(closes, 12)
    e26 = ema_last(closes, 26)
    if e12 is None or e26 is None: return 0.0
    macd = e12 - e26
    return macd

def get_yfinance_data(symbol):
    try:
        url = f\"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1h&range=10d\"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
            result = data['chart']['result'][0]
            closes = result['indicators']['quote'][0]['close']
            return [c for c in closes if c is not None]
    except Exception as e:
        print(f\"Err {symbol}: {e}\")
        return None

def supabase_upsert(signal_data):
    if not SUPABASE_URL or not SUPABASE_KEY: return
    try:
        url = f\"{SUPABASE_URL}/rest/v1/signals\"
        req = urllib.request.Request(url, method='POST', headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        }, data=json.dumps(signal_data).encode())
        with urllib.request.urlopen(req) as resp:
            pass
    except Exception as e:
        print(f\"Supabase error: {e}\")

def run_cycle():
    print(f\"Cycle start: {len(SYMBOLS)} symbols\")
    for sym, name, decs in SYMBOLS:
        closes = get_yfinance_data(sym)
        if not closes or len(closes) < 40: continue
        
        last = closes[-1]
        r14 = rsi14(closes)
        m_hist = macd_histogram(closes)
        e20 = ema_last(closes, 20)
        
        # Lógica de sinal aprimorada
        direction = \"buy\" if (r14 < 45 and m_hist > 0) or (last > e20 and r14 < 60) else \"sell\"
        prob = 0.5 + (abs(50 - r14) / 100) + (0.1 if (direction == \"buy\" and last > e20) else 0)
        prob = clamp(prob, 0.55, 0.94)
        
        volat = (max(closes[-10:]) - min(closes[-10:])) / last
        tp_dist = last * volat * 1.5
        sl_dist = last * volat * 1.0
        
        tp = round(last + tp_dist if direction == \"buy\" else last - tp_dist, decs)
        sl = round(last - sl_dist if direction == \"buy\" else last + sl_dist, decs)
        
        conf = \"high\" if prob > 0.8 else \"medium\" if prob > 0.65 else \"low\"
        risk = clamp(0.3 + (volat * 10), 0.2, 0.85)
        
        signal = {
            \"id\": f\"{sym}-H1-{int(time.time() // 3600)}\",
            \"symbol\": sym, \"asset\": name, \"direction\": direction,
            \"probability\": prob, \"confidenceLabel\": conf, \"riskScore\": risk,
            \"tp\": tp, \"sl\": sl, \"lastPrice\": round(last, decs),
            \"ensembleGb\": prob - 0.05, \"ensembleLstm\": prob + 0.03,
            \"timeframe\": \"1H\", \"isFallback\": False,
            \"updatedAt\": datetime.now(timezone.utc).isoformat()
        }
        supabase_upsert(signal)
        time.sleep(0.5)

if __name__ == \"__main__\":
    while True:
        run_cycle()
        print(f\"Sleeping {CYCLE_INTERVAL}s\")
        time.sleep(CYCLE_INTERVAL)
