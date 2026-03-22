# TradeAI Signals

SaaS **Next.js 15 (App Router)** — um único repositório e um único deploy na **Vercel**. O backend segue o padrão **BFF**: o browser só chama [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) em `app/api/*`; lógica de mercado e IA em `lib/*`.

## Motor de sinais (sem mocks na API)

- **Produção (`GET /api/signals`)** usa `getIASignalsResult()` em `lib/ia-signals.ts`:
  - Dados diários via **Yahoo Finance** (`lib/market-data.ts` + `yahoo-finance2`).
  - Features em `lib/signal-features.ts`: ensemble **determinístico** com momentum/SMA20, RSI(14), **EMA 12/26**, **MACD** (hist normalizado), **Bollinger** (posição −1…1), volatilidade de **range** intradiária (proxy), penalização de vol nos scores.
  - Decisão **BUY/SELL** por ensemble de regras (pesos no score final); probabilidade calibrada; TP/SL com **ATR(14)** e reward/risk ~1.8.
  - Cada sinal inclui:
    - **`riskScore`** (0–1): combina ATR relativo ao preço, volatilidade de range e relação TP/SL (reward/risk).
    - **`confidenceLabel`**: `"low"` \| `"medium"` \| `"high"`, derivado de probabilidade e `riskScore` (maior risco reduz a confiança percecionada).
  - **Cache** em memória (~45s, configurável com `MARKET_DATA_CACHE_TTL_MS`) para não martelar a API de dados.
- Se o Yahoo falhar para todos os símbolos, há **fallback** determinístico (marcado com **`isFallback: true`**) para não partir o dashboard.
- **Landing / marketing** usa apenas `generateDemoSignals()` em `lib/ia-signals-demo.ts` (determinístico, sem rede) — **não** importa `yahoo-finance2` no cliente.

### Meta da resposta JSON (`GET /api/signals`)

O objeto **`meta`** informa o cliente qual caminho foi usado:

| Campo | Significado |
| ----- | ----------- |
| `engine` | `"python"` — resposta do bot FastAPI; `"node"` — motor Node/Yahoo; `"node-fallback"` — `USE_PYTHON_BOT=true` mas o Python falhou ou devolveu vazio, pelo que correu o motor Node. |
| `dataSource` | `"yahoo"` — dados de mercado reais (Node ou, no modo Python, yfinance no servidor Python); `"fallback"` — sintético porque não houve barras válidas. |
| `pythonAttempted` | `true` se `USE_PYTHON_BOT=true` (mesmo quando caiu para Node). |
| `yahooConnected` | Heurística para UI: `true` se `engine === "python"` **ou** `dataSource === "yahoo"` (ou seja, não está só em fallback sintético). |
| `tier` | Plano Supabase (cap de sinais), quando aplicável. |

## Modo Python (opcional, mesmo repo)

- Ficheiro: `api/python/signals.py` → na Vercel expõe **`/api/python/signals`** (FastAPI + `yfinance`), com funções **`fetch_data` → `build_features` → `generate_signal_row`** alinhadas ao mesmo formato de sinal que o Node (`riskScore`, `confidenceLabel`, `ensembleGb` / `ensembleLstm`, `direction`, `lastPrice`, etc.).
- Motivo do path: o Next.js já usa `app/api/signals/route.ts` para **`/api/signals`** — não há dois handlers no mesmo URL.
- Ative com **`USE_PYTHON_BOT=true`**. O servidor Node faz `fetch` ao URL interno (`INTERNAL_APP_URL` ou `NEXT_PUBLIC_APP_URL`, depois `VERCEL_URL`) + `/api/python/signals`. Se o Python falhar ou responder vazio, o motor Node corre com **`meta.engine = "node-fallback"`** e **`meta.dataSource`** `"yahoo"` ou `"fallback"` conforme o caso.
- **Vercel (produção):** definir `USE_PYTHON_BOT=true`, `INTERNAL_APP_URL` para o URL canónico do projeto (ex.: `https://seu-projeto.vercel.app`) se o fetch server-side precisar de base fixa.
- **Local:** `npm run dev` não serve funções Python. Use **`vercel dev`** (com as mesmas env) para testar Node + Python no mesmo processo, ou teste só o deploy.

Dependências Python: `requirements.txt` (e `pyproject.toml` mínimo).

## Setup em ~5 minutos

1. **Clonar e instalar**

   ```bash
   git clone <repo> tradeai-signals && cd tradeai-signals
   npm install
   ```

2. **Variáveis de ambiente** — copiar `.env.example` para `.env.local`:

   - Supabase, Stripe, opcional Resend / GA4 / PostHog / Telegram.
   - `NEXT_PUBLIC_APP_URL` e, para o motor Python ou fetch interno, `INTERNAL_APP_URL` (ex.: `http://127.0.0.1:3000` em dev).
   - `USE_PYTHON_BOT=false` por defeito.

3. **Supabase** — executar `supabase/migrations/001_initial.sql` e configurar Auth (Email + Google).

4. **Stripe** — preços EUR, webhook em `/api/stripe/webhook`.

5. **Correr localmente (motor Node)**

   ```bash
   npm run dev
   ```

   Abrir `/dashboard/signals` — sinais vindos de dados reais (Yahoo) quando a rede permitir.

6. **Deploy Vercel (um projeto)**

   - Ligar o repositório, definir as mesmas env vars.
   - A Vercel instala dependências **Node** (`package.json`) e **Python** (`requirements.txt`) no mesmo projeto.
   - Build: `npm run build` (Next.js; não é Vite).

## Scripts

| Comando         | Descrição       |
| --------------- | --------------- |
| `npm run dev`   | Dev (Turbopack) |
| `npm run build` | Build produção  |
| `npm run start` | Servidor prod   |
| `npm run test`  | Vitest          |
| `npm run lint`  | ESLint          |

## Testes

```bash
npm run test
```

## Notas

- **Telegram**: Premium — `POST /api/telegram/register` com `{"chatId":"..."}`.
- **PWA**: `public/manifest.json`, `public/sw.js`.
- **RGPD**: `/privacy`, `/terms`, `/cookies`.

## Licença

Projeto de exemplo — adapte termos e compliance antes de produção com utilizadores reais.
