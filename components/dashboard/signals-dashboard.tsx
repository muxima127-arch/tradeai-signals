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
import { Activity, Radio, RefreshCw } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
          <span className="text-[10px] text-muted-foreground">{s.symbol}</span>
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
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="tabular-nums">{s.tp}</TableCell>
      <TableCell className="tabular-nums">{s.sl}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{s.timeframe}</TableCell>
    </>
  );
});

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i);
  return Math.abs(h);
}

function CandleMock({ signal }: { signal: GeneratedSignal | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => {
    const pts: { i: number; o: number; h: number; l: number; c: number }[] = [];
    const seed = signal ? hashSeed(signal.id) : 1;
    const rand = (() => {
      let x = seed;
      return () => {
        x = (x * 1664525 + 1013904223) % 4294967296;
        return x / 4294967296;
      };
    })();
    const base = signal?.lastPrice ?? 100;
    let c = base;
    for (let i = 0; i < 40; i++) {
      const o = c;
      c = o + (Math.sin(i * 0.35 + seed * 0.001) * 0.6 + (i % 3) * 0.1 + (rand() - 0.5) * 0.15);
      const h = Math.max(o, c) + 0.2;
      const l = Math.min(o, c) - 0.2;
      pts.push({ i, o, h, l, c });
    }
    return pts;
  }, [signal]);

  const tp = signal?.tp ?? data[data.length - 1]!.c * 1.002;
  const sl = signal?.sl ?? data[data.length - 1]!.c * 0.998;

  if (!mounted) {
    return <Skeleton className="h-full w-full rounded-lg" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis dataKey="i" hide />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="c"
          stroke="oklch(0.65 0.15 155)"
          fill="oklch(0.65 0.15 155 / 0.15)"
          name="Close"
        />
        <Line type="monotone" dataKey="c" stroke="oklch(0.65 0.15 155)" dot={false} strokeWidth={1.5} />
        <ReferenceLine y={tp} stroke="oklch(0.65 0.2 145)" strokeDasharray="4 4" label="TP" />
        <ReferenceLine y={sl} stroke="oklch(0.55 0.2 25)" strokeDasharray="4 4" label="SL" />
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

    return () => {
      void supabase.removeChannel(channel);
    };
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
          <Radio className={`size-4 ${live ? "text-emerald-400" : "text-muted-foreground"}`} />
          <span>{live ? "Realtime ligado" : "Polling / aguarde DB"}</span>
          {apiMeta ? (
            <>
              <span className="hidden sm:inline">·</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                engine={apiMeta.engine}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                data={apiMeta.dataSource}
              </Badge>
              {apiMeta.pythonAttempted ? (
                <Badge variant="secondary" className="text-[10px]">
                  Python tentado
                </Badge>
              ) : null}
              <Badge variant={apiMeta.yahooConnected ? "default" : "destructive"} className="text-[10px]">
                Yahoo: {apiMeta.yahooConnected ? "sim" : "não"}
              </Badge>
            </>
          ) : null}
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void refresh()}>
          <RefreshCw className="size-4" />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="sym-filter" className="text-xs text-muted-foreground">
            Símbolo / ativo
          </label>
          <input
            id="sym-filter"
            className="h-9 min-w-[140px] rounded-md border border-input bg-background px-2 text-sm"
            placeholder="ex: GC=F, Gold"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="conf-filter" className="text-xs text-muted-foreground">
            Confiança
          </label>
          <select
            id="conf-filter"
            className="h-9 min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
            value={confidenceFilter}
            onChange={(e) =>
              setConfidenceFilter(e.target.value as "all" | ConfidenceLabel)
            }
          >
            <option value="all">Todas</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              Candlestick (mock) + TP/SL
            </CardTitle>
            <CardDescription>{selected?.asset ?? "—"}</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] min-h-[240px] min-w-0">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <CandleMock signal={selected} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">IA — ensemble & risco</CardTitle>
            <CardDescription>
              {selected
                ? `GB ${(selected.ensembleGb * 100).toFixed(1)}% · LSTM ${(selected.ensembleLstm * 100).toFixed(1)}% · Risco ${(selected.riskScore * 100).toFixed(0)}% · ${selected.confidenceLabel.toUpperCase()}`
                : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Ensemble: MACD, Bollinger, EMA12/26, momentum, RSI e volatilidade. Risco 0–1 combina ATR%, vol
              de range e RR.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Sinais</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Sinal</TableHead>
                  <TableHead>Prob.</TableHead>
                  <TableHead>Conf.</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>TP</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>TF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignals.map((s) => (
                  <TableRow
                    key={s.id}
                    className={`cursor-pointer ${selected?.id === s.id ? "bg-muted/50" : ""}`}
                    onClick={() => setSelected(s)}
                  >
                    <SignalCells s={s} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
