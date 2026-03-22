import type { Metadata } from "next";
import Link from "next/link";
import { getIASignalsResult } from "@/lib/ia-signals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, TrendingUp, TrendingDown, Radio } from "lucide-react";

export const metadata: Metadata = {
  title: "Sinais ao Vivo — TradeAI Signals",
  description: "Preview dos sinais IA em tempo real para Brent, Gold, S&P 500, Nasdaq, Forex CFDs. Precisao 78%. Subscreva para acesso completo.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SignalsPublicPage() {
  let signals: Awaited<ReturnType<typeof getIASignalsResult>>["signals"] = [];
  try {
    const result = await getIASignalsResult({ limit: 8 });
    signals = result.signals;
  } catch {
    signals = [];
  }

  const FREE_VISIBLE = 2; // mostrar 2 sinais gratis, resto com blur

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Radio className="size-4 animate-pulse text-green-400" />
            <span className="text-sm text-green-400 font-medium">Sinais Ao Vivo</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Sinais IA em Tempo Real</h1>
          <p className="mt-3 text-muted-foreground">
            {signals.length} ativos · Motor GB+LSTM · Atualizado a cada 4 horas
          </p>
        </div>

        {/* Signals grid */}
        <div className="space-y-3">
          {signals.map((s, i) => (
            <div
              key={s.id ?? `${s.symbol}-${i}`}
              className={`relative rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm transition-all ${
                i >= FREE_VISIBLE ? "select-none" : ""
              }`}
            >
              {/* Blur overlay for non-free signals */}
              {i >= FREE_VISIBLE && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/80 backdrop-blur-sm">
                  <Lock className="size-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Subscreva para ver este sinal</p>
                  <Button size="sm" asChild>
                    <Link href="/signup">Comecar gratis</Link>
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${
                    s.direction === "buy" ? "bg-green-500/15" : "bg-red-500/15"
                  }`}>
                    {s.direction === "buy"
                      ? <TrendingUp className="size-5 text-green-400" />
                      : <TrendingDown className="size-5 text-red-400" />}
                  </div>
                  <div>
                    <p className="font-semibold">{s.asset}</p>
                    <p className="text-xs text-muted-foreground">{s.symbol} · {s.timeframe}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.direction === "buy" ? "default" : "destructive"}>
                    {s.direction.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    {(s.probability * 100).toFixed(0)}%
                  </Badge>
                  <Badge
                    variant={s.confidenceLabel === "high" ? "default" : s.confidenceLabel === "medium" ? "secondary" : "outline"}
                    className="hidden sm:inline-flex"
                  >
                    {s.confidenceLabel.toUpperCase()}
                  </Badge>
                </div>
              </div>
              {i < FREE_VISIBLE && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-center">
                    <p className="text-muted-foreground">TP</p>
                    <p className="font-mono font-semibold">{s.tp}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-center">
                    <p className="text-muted-foreground">SL</p>
                    <p className="font-mono font-semibold">{s.sl}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-center">
                    <p className="text-muted-foreground">Risco</p>
                    <p className="font-mono font-semibold">{(s.riskScore * 100).toFixed(0)}%</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <h2 className="text-xl font-semibold">Acesso Completo por €9/mês</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Todos os sinais + alertas email + risk score + TP/SL para todos os ativos
          </p>
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="rounded-xl px-8">
              <Link href="/signup">Trial 7 dias gratis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-xl">
              <Link href="/#pricing">Ver planos</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
