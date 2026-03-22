"use client";
import { useMemo, useState, memo, useEffect, useCallback } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import type { GeneratedSignal } from "@/lib/ia-signals-types";

const ASSET_LABELS: Record<string, string> = {
  "BZ=F": "BZ",
  "GC=F": "GC",
  "ES=F": "ES",
  "EURUSD=X": "EURUSD",
  "NQ=F": "NQ",
  "CL=F": "CL",
  "GBPUSD=X": "GBPUSD",
  "USDJPY=X": "USDJPY",
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSeriesFromSignal(signal: GeneratedSignal | null, seed: number) {
  const rand = mulberry32(seed * 7919 + 42);
  const pts: { t: string; gb: number; lstm: number; ensemble: number; price: number }[] = [];
  const base = signal?.lastPrice ?? 100;
  let price = base;
  for (let i = 0; i < 48; i++) {
    const r = Math.sin(i * 0.25 + seed) * (base * 0.003) + (seed % 5) * 0.001;
    price += r + (rand() - 0.5) * (base * 0.002);
    const gb = signal ? Math.min(0.95, Math.max(0.15, signal.ensembleGb + Math.sin(i * 0.2) * 0.05)) : 0.55 + Math.sin(i * 0.2) * 0.12;
    const lstm = signal ? Math.min(0.95, Math.max(0.15, signal.ensembleLstm + Math.cos(i * 0.18) * 0.04)) : 0.52 + Math.cos(i * 0.18) * 0.1;
    const ensemble = gb * 0.55 + lstm * 0.45;
    pts.push({
      t: `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
      price: Math.round(price * 100) / 100,
      gb: Math.round(gb * 1000) / 1000,
      lstm: Math.round(lstm * 1000) / 1000,
      ensemble: Math.round(ensemble * 1000) / 1000,
    });
  }
  return pts;
}

export const LandingDemo = memo(function LandingDemo() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [signals, setSignals] = useState<GeneratedSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState("GC=F");

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch("/api/signals", { cache: "no-store" });
      const json = await res.json() as { signals: GeneratedSignal[] };
      if (json.signals?.length) {
        setSignals(json.signals);
        setAsset(json.signals[0].symbol);
      }
    } catch {
      // silently fail — chart remains with fallback visuals
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void fetchSignals();
  }, [fetchSignals]);

  const snapshot = useMemo(
    () => signals.find((s) => s.symbol === asset) ?? signals[0] ?? null,
    [signals, asset]
  );

  const seed = useMemo(() => {
    const idx = signals.findIndex((s) => s.symbol === asset);
    return idx >= 0 ? idx + 3 : 3;
  }, [signals, asset]);

  const data = useMemo(() => buildSeriesFromSignal(snapshot, seed), [snapshot, seed]);

  const assetKeys = signals.length > 0 ? signals.map((s) => s.symbol) : ["BZ=F", "GC=F", "ES=F", "EURUSD=X"];

  const isLive = signals.length > 0 && !signals[0]?.isFallback;

  return (
    <section id="demo" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("demo.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("demo.sub")}</p>
        </div>
        <Card className="overflow-hidden border-border/80 bg-card/60 shadow-xl backdrop-blur-md">
          <CardHeader className="flex flex-col gap-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Ensemble · GB + LSTM
                {isLive && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0.5">AO VIVO</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {snapshot?.asset} · {snapshot?.direction.toUpperCase()} · risk{" "}
                {snapshot?.riskScore} /1
                {isLive ? (
                  <span className="ml-2 text-green-500 text-[10px]">dados reais</span>
                ) : (
                  <span className="ml-2 text-muted-foreground text-[10px]">demo</span>
                )}
              </CardDescription>
            </div>
            <Tabs
              value={asset}
              onValueChange={(v) => setAsset(v)}
            >
              <TabsList>
                {assetKeys.map((k) => (
                  <TabsTrigger key={k} value={k}>
                    {ASSET_LABELS[k] ?? k.replace("=F", "").replace("=X", "")}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            {!mounted || loading ? (
              <Skeleton className="h-72 w-full rounded-none" />
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <ComposedChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} interval={7} />
                  <YAxis yAxisId="left" domain={["auto", "auto"]} hide />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area yAxisId="left" type="monotone" dataKey="price" name="Preço" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted)/0.15)" dot={false} strokeWidth={1.5} />
                  <Line yAxisId="right" type="monotone" dataKey="ensemble" name="Ensemble" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="gb" name="Gradient Boosting" stroke="#22d3ee" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
                  <Line yAxisId="right" type="monotone" dataKey="lstm" name="LSTM" stroke="#f97316" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
});
