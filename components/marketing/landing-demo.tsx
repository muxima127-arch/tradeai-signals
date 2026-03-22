"use client";

import { useMemo, useState, memo, useEffect } from "react";
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
import { useI18n } from "@/lib/i18n";
import { generateDemoSignals } from "@/lib/ia-signals-demo";

const ASSET_KEYS = ["BZ=F", "GC=F", "ES=F", "EURUSD=X"] as const;

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSeries(seed: number) {
  const rand = mulberry32(seed * 7919 + 42);
  const pts: {
    t: string;
    price: number;
    gb: number;
    lstm: number;
    ensemble: number;
  }[] = [];
  let price = 100 + (seed % 17);
  for (let i = 0; i < 48; i++) {
    const r = Math.sin(i * 0.25 + seed) * 0.8 + (seed % 5) * 0.1;
    price += r + (rand() - 0.5) * 0.4;
    const gb = 0.55 + Math.sin(i * 0.2) * 0.12;
    const lstm = 0.52 + Math.cos(i * 0.18) * 0.1;
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
  const [asset, setAsset] = useState<(typeof ASSET_KEYS)[number]>("GC=F");
  const seed = useMemo(() => ASSET_KEYS.indexOf(asset) + 3, [asset]);
  const data = useMemo(() => buildSeries(seed), [seed]);
  const snapshot = useMemo(() => generateDemoSignals({ seed, count: 1 })[0], [seed]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section id="demo" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("demo.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("demo.sub")}</p>
        </div>
        <Card className="overflow-hidden border-border/80 bg-card/60 shadow-xl backdrop-blur-md">
          <CardHeader className="flex flex-col gap-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Ensemble · GB + LSTM</CardTitle>
              <CardDescription>
                {snapshot?.asset} · {snapshot?.direction.toUpperCase()} · risk {snapshot?.riskScore}
                /100
              </CardDescription>
            </div>
            <Tabs value={asset} onValueChange={(v) => setAsset(v as (typeof ASSET_KEYS)[number])}>
              <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
                {ASSET_KEYS.map((k) => (
                  <TabsTrigger key={k} value={k} className="text-xs sm:text-sm">
                    {k.replace("=F", "").replace("=X", "")}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="h-[380px] min-h-[280px] min-w-0 pt-6">
            {!mounted ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.15 155)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.65 0.15 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} interval={6} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid oklch(0.5 0 0 / 0.2)",
                    background: "oklch(0.2 0 0 / 0.95)",
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="price"
                  stroke="oklch(0.65 0.15 155)"
                  fill="url(#fillPrice)"
                  name="Preço (mock)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="gb"
                  stroke="oklch(0.7 0.12 250)"
                  dot={false}
                  strokeWidth={2}
                  name="Gradient Boosting"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="lstm"
                  stroke="oklch(0.75 0.15 45)"
                  dot={false}
                  strokeWidth={2}
                  name="LSTM"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ensemble"
                  stroke="oklch(0.85 0.05 0)"
                  dot={false}
                  strokeWidth={2}
                  name="Ensemble"
                />
              </ComposedChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
});
