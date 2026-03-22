"use client";
import { memo, useCallback, useEffect, useMemo, useState, Suspense } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiSignalsResponseMeta, ConfidenceLabel, GeneratedSignal } from "@/lib/ia-signals-types";
import { createClientSafe } from "@/lib/supabase/client";
import { Activity, Radio, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { cacheSignalsOffline } from "@/lib/offline-cache";

function confidenceBadgeVariant(
  c: ConfidenceLabel
): "default" | "secondary" | "outline" {
  if (c === "high") return "default";
  if (c === "medium") return "secondary";
  return "outline";
}

const SignalCells = memo(function SignalCells({ s }: { s: GeneratedSignal }) {
  return (
    <>
      <TableCell className="font-medium">
        <div className="flex flex-col gap-1">
          <span>{s.asset}</span>
          <span className="text-[10px] text-muted-foreground uppercase">{s.symbol}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={s.direction === "buy" ? "default" : "destructive"}>
          {s.direction.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell className="tabular-nums">{(s.probability * 100).toFixed(1)}%</TableCell>
      <TableCell>
        <Badge variant={confidenceBadgeVariant(s.confidenceLabel)} className="uppercase">
          {s.confidenceLabel}
        </Badge>
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground">
        {(s.riskScore * 100).toFixed(0)}%
      </TableCell>
      <TableCell>
        {s.isFallback ? (
          <Badge variant="destructive" className="text-[10px]">
            FALLBACK
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
            IA LIVE
          </Badge>
        )}
      </TableCell>
      <TableCell className="tabular-nums font-semibold text-emerald-500">{s.tp}</TableCell>
      <TableCell className="tabular-nums font-semibold text-rose-500">{s.sl}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{s.timeframe}</TableCell>
    </>
  );
});

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i);
  return Math.abs(h);
}

function ProfessionalChart({ signal }: { signal: GeneratedSignal | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = useMemo(() => {
    const pts: any[] = [];
    const seed = signal ? hashSeed(signal.id) : 1;
    const rand = (() => {
      let x = seed;
      return () => {
        x = (x * 1664525 + 1013904223) % 4294967296;
        return x / 4294967296;
      };
    })();

    const base = signal?.lastPrice ?? 100;
    let current = base * 0.995;
    
    for (let i = 0; i < 40; i++) {
      const open = current;
      const change = (Math.sin(i * 0.2 + seed * 0.1) * 0.4 + (rand() - 0.5) * 0.8);
      const close = open + change;
      const high = Math.max(open, close) + rand() * 0.2;
      const low = Math.min(open, close) - rand() * 0.2;
      const volume = 100 + rand() * 200;
      
      pts.push({ 
        time: i, 
        open, high, low, close, 
        volume,
        isUp: close >= open 
      });
      current = close;
    }
    return pts;
  }, [signal]);

  if (!mounted) return <Skeleton className="h-full w-full rounded-lg" />;

  const tp = signal?.tp ?? 0;
  const sl = signal?.sl ?? 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="time" hide />
        <YAxis 
          domain={['auto', 'auto']} 
          orientation="right"
          tick={{ fontSize: 10, fill: '#888' }} 
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: '12px' }}
          itemStyle={{ padding: '0px' }}
        />
        
        {/* Volume Bars */}
        <Bar dataKey="volume" yAxisId={0} fillOpacity={0.1}>
           {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.isUp ? '#10b981' : '#f43f5e'} />
          ))}
        </Bar>

        {/* Price Action Line (as proxy for candlestick in Recharts) */}
        <Line 
          type="monotone" 
          dataKey="close" 
          stroke={signal?.direction === 'buy' ? '#10b981' : '#f43f5e'} 
          dot={false} 
          strokeWidth={2}
          animationDuration={300}
        />

        {/* Take Profit Line */}
        {tp > 0 && (
          <ReferenceLine 
            y={tp} 
            stroke="#10b981" 
            strokeDasharray="5 5" 
            label={{ 
              position: 'right', 
              value: `TP: ${tp}`, 
              fill: '#10b981', 
              fontSize: 10,
              fontWeight: 'bold',
              backgroundColor: 'rgba(16, 185, 129, 0.1)'
            }} 
          />
        )}

        {/* Stop Loss Line */}
        {sl > 0 && (
          <ReferenceLine 
            y={sl} 
            stroke="#f43f5e" 
            strokeDasharray="5 5" 
            label={{ 
              position: 'right', 
              value: `SL: ${sl}`, 
              fill: '#f43f5e', 
              fontSize: 10,
              fontWeight: 'bold'
            }} 
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SignalsDashboard() {
  const [signals, setSignals] = useState<GeneratedSignal[]>([]);
  const [apiMeta, setApiMeta] = useState<ApiSignalsResponseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<GeneratedSignal | null>(null);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | ConfidenceLabel>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/signals", { cache: "no-store" });
      const json = (await res.json()) as {
        signals: GeneratedSignal[];
        meta: ApiSignalsResponseMeta;
      };
      setSignals(json.signals ?? []);
      setApiMeta(json.meta ?? null);
      if (json.signals?.[0]) setSelected(json.signals[0]);
      cacheSignalsOffline(json.signals ?? []);
    } catch {
      toast.error("Falha ao carregar sinais");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const supabase = createClientSafe();
    if (!supabase) return;
    const channel = supabase
      .channel("signals-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signals" },
        () => {
          setLive(true);
          void refresh();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive(true);
      });
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      const symOk =
        !symbolFilter.trim() ||
        s.symbol.toLowerCase().includes(symbolFilter.toLowerCase()) ||
        s.asset.toLowerCase().includes(symbolFilter.toLowerCase());
      const confOk =
        confidenceFilter === "all" || s.confidenceLabel === confidenceFilter;
      return symOk && confOk;
    });
  }, [signals, symbolFilter, confidenceFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
          <Radio className={`size-4 ${live ? "text-emerald-400 animate-pulse" : "text-muted-foreground"}`} />
          <span className="font-medium">{live ? "Streaming Real-time" : "Polling / Modo Demo"}</span>
          {apiMeta && (
            <div className="flex gap-2 ml-2 border-l pl-2 border-border/50">
              <Badge variant="outline" className="font-mono text-[10px] bg-muted/30">
                {apiMeta.engine.toUpperCase()}
              </Badge>
              <Badge variant={apiMeta.yahooConnected ? "default" : "destructive"} className="text-[10px]">
                Yahoo: {apiMeta.yahooConnected ? "OK" : "ERR"}
              </Badge>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => void refresh()}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Recarregar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Enhanced Chart Section */}
        <Card className="lg:col-span-2 border-border/80 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="size-5 text-emerald-500" />
                  Visualização do Sinal
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-foreground">{selected?.asset}</span>
                  <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-muted font-mono">{selected?.symbol}</span>
                </CardDescription>
              </div>
              {selected && (
                <div className="text-right">
                  <div className={`text-xl font-bold ${selected.direction === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {selected.direction.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Recomendação</div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-[350px] p-0 pt-4">
             <ProfessionalChart signal={selected} />
          </CardContent>
        </Card>

        {/* AI Analysis Sidebar */}
        <Card className="border-border/80 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-500" />
              Análise Ensemble IA
            </CardTitle>
            <CardDescription>Métricas de confiança e risco</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selected ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase">Win Rate Est.</div>
                    <div className="text-2xl font-bold">{(selected.probability * 100).toFixed(1)}%</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase">Score de Risco</div>
                    <div className={`text-2xl font-bold ${selected.riskScore > 0.6 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {(selected.riskScore * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span>Gradient Boosting</span>
                    <span className="font-mono">{(selected.ensembleGb * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${selected.ensembleGb * 100}%` }} />
                  </div>
                  
                  <div className="flex justify-between text-xs">
                    <span>LSTM Neural Network</span>
                    <span className="font-mono">{(selected.ensembleLstm * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${selected.ensembleLstm * 100}%` }} />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 text-xs text-muted-foreground leading-relaxed">
                  <strong>Indicadores em análise:</strong> MACD, Bollinger Bands, EMA12/26, RSI (14), ATR Volatility e Volume Cluster.
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Selecione um ativo para análise
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card/30 p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label htmlFor="sym-filter" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            Filtrar Mercado
          </label>
          <input
            id="sym-filter"
            className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
            placeholder="Pesquisar ativos (ex: BTC, Gold, Apple...)"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="conf-filter" className="text-xs font-medium text-muted-foreground">Confiança IA</label>
          <select
            id="conf-filter"
            className="h-10 min-w-[140px] rounded-md border border-input bg-background/50 px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value as "all" | ConfidenceLabel)}
          >
            <option value="all">Todos os Níveis</option>
            <option value="high">Alta Confiança</option>
            <option value="medium">Média Confiança</option>
            <option value="low">Baixa Confiança</option>
          </select>
        </div>
      </div>

      <Card className="border-border/80 shadow-xl shadow-black/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-bold">Terminal de Sinais em Tempo Real</CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase tracking-tighter">Mercados Globais</Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading && signals.length === 0 ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Ativo</TableHead>
                  <TableHead>Sinal</TableHead>
                  <TableHead>Prob.</TableHead>
                  <TableHead>IA Status</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-emerald-500">TP</TableHead>
                  <TableHead className="text-rose-500">SL</TableHead>
                  <TableHead>TF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignals.map((s) => (
                  <TableRow
                    key={s.id}
                    className={`group cursor-pointer transition-colors ${selected?.id === s.id ? "bg-emerald-500/5" : "hover:bg-muted/30"}`}
                    onClick={() => setSelected(s)}
                  >
                    <SignalCells s={s} />
                  </TableRow>
                ))}
                {filteredSignals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      Nenhum sinal encontrado para os filtros atuais.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
