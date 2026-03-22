\"use client\";
import { memo, useCallback, useEffect, useMemo, useState, Suspense, useRef } from \"react\";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from \"@/components/ui/table\";
import { Badge } from \"@/components/ui/badge\";
import { Button } from \"@/components/ui/button\";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from \"@/components/ui/card\";
import { Skeleton } from \"@/components/ui/skeleton\";
import type { ApiSignalsResponseMeta, ConfidenceLabel, GeneratedSignal } from \"@/lib/ia-signals-types\";
import { createClientSafe } from \"@/lib/supabase/client\";
import { Activity, Radio, RefreshCw, TrendingUp, TrendingDown, LayoutGrid, BarChart3, Globe } from \"lucide-react\";
import { toast } from \"sonner\";
import { cacheSignalsOffline } from \"@/lib/offline-cache\";

function confidenceBadgeVariant(c: ConfidenceLabel): \"default\" | \"secondary\" | \"outline\" {
  if (c === \"high\") return \"default\";
  if (c === \"medium\") return \"secondary\";
  return \"outline\";
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewWidget = memo(function TradingViewWidget({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null);
  const tvId = `tv_widget_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}`;

  useEffect(() => {
    const script = document.createElement(\"script\");
    script.src = \"https://s3.tradingview.com/tv.js\";
    script.async = true;
    script.onload = () => {
      if (container.current && window.TradingView) {
        new window.TradingView.widget({
          \"autosize\": true,
          \"symbol\": symbol.includes(\"=\") ? symbol.split(\"=\")[0] : symbol,
          \"interval\": \"60\",
          \"timezone\": \"Etc/UTC\",
          \"theme\": \"dark\",
          \"style\": \"1\",
          \"locale\": \"pt\",
          \"toolbar_bg\": \"#f1f3f6\",
          \"enable_publishing\": false,
          \"hide_side_toolbar\": false,
          \"allow_symbol_change\": true,
          \"container_id\": tvId
        });
      }
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [symbol, tvId]);

  return <div id={tvId} ref={container} className=\"h-full w-full\" />;
});

const SignalCells = memo(function SignalCells({ s }: { s: GeneratedSignal }) {
  return (
    <>
      <TableCell className=\"font-medium\">
        <div className=\"flex flex-col gap-1\">
          <span>{s.asset}</span>
          <span className=\"text-[10px] text-muted-foreground uppercase\">{s.symbol}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={s.direction === \"buy\" ? \"default\" : \"destructive\"}>
          {s.direction.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell className=\"tabular-nums\">{(s.probability * 100).toFixed(1)}%</TableCell>
      <TableCell>
        <Badge variant={confidenceBadgeVariant(s.confidenceLabel)} className=\"uppercase\">
          {s.confidenceLabel}
        </Badge>
      </TableCell>
      <TableCell className=\"tabular-nums text-muted-foreground\">
        {(s.riskScore * 100).toFixed(0)}%
      </TableCell>
      <TableCell>
        {s.isFallback ? (
          <Badge variant=\"destructive\" className=\"text-[10px]\">FALLBACK</Badge>
        ) : (
          <Badge variant=\"outline\" className=\"text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/5\">IA LIVE</Badge>
        )}
      </TableCell>
      <TableCell className=\"tabular-nums font-semibold text-emerald-500\">{s.tp}</TableCell>
      <TableCell className=\"tabular-nums font-semibold text-rose-500\">{s.sl}</TableCell>
      <TableCell className=\"text-xs text-muted-foreground\">{s.timeframe}</TableCell>
    </>
  );
});

export function SignalsDashboard() {
  const [signals, setSignals] = useState<GeneratedSignal[]>([]);
  const [apiMeta, setApiMeta] = useState<ApiSignalsResponseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<GeneratedSignal | null>(null);
  const [symbolFilter, setSymbolFilter] = useState(\"\");
  const [confidenceFilter, setConfidenceFilter] = useState<\"all\" | ConfidenceLabel>(\"all\");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(\"/api/signals\", { cache: \"no-store\" });
      const json = await res.json();
      setSignals(json.signals ?? []);
      setApiMeta(json.meta ?? null);
      if (json.signals?.[0] && !selected) setSelected(json.signals[0]);
      cacheSignalsOffline(json.signals ?? []);
    } catch {
      toast.error(\"Falha ao carregar sinais\");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const supabase = createClientSafe();
    if (!supabase) return;
    const channel = supabase.channel(\"signals-feed\").on(\"postgres_changes\", 
      { event: \"INSERT\", schema: \"public\", table: \"signals\" }, () => {
        setLive(true);
        void refresh();
      }).subscribe((status) => { if (status === \"SUBSCRIBED\") setLive(true); });
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      const symOk = !symbolFilter.trim() || s.symbol.toLowerCase().includes(symbolFilter.toLowerCase()) || s.asset.toLowerCase().includes(symbolFilter.toLowerCase());
      const confOk = confidenceFilter === \"all\" || s.confidenceLabel === confidenceFilter;
      return symOk && confOk;
    });
  }, [signals, symbolFilter, confidenceFilter]);

  return (
    <div className=\"space-y-6 animate-in fade-in duration-700\">
      {/* Top Header Controls */}
      <div className=\"flex flex-wrap items-center justify-between gap-4\">
        <div className=\"flex flex-wrap items-center gap-2 text-xs text-muted-foreground\">
          <Radio className={`size-4 ${live ? \"text-emerald-400 animate-pulse\" : \"text-muted-foreground\"}`} />
          <span className=\"font-bold uppercase tracking-wider\">{live ? \"Real-time Engine Active\" : \"Syncing Data...\"}</span>
          {apiMeta && (
            <div className=\"flex gap-2 ml-2 border-l pl-2 border-border/50\">
               <Badge variant=\"outline\" className=\"bg-emerald-500/10 text-emerald-500 border-emerald-500/20\">{apiMeta.engine}</Badge>
            </div>
          )}
        </div>
        <div className=\"flex gap-2\">
          <Button variant=\"outline\" size=\"sm\" className=\"gap-2 h-9 border-emerald-500/20 hover:bg-emerald-500/5\" onClick={() => void refresh()}>
            <RefreshCw className={`size-3.5 ${loading ? \"animate-spin\" : \"\"}`} />
            Force Sync
          </Button>
        </div>
      </div>

      <div className=\"grid gap-6 lg:grid-cols-4\">
        {/* Advanced Chart Terminal */}
        <Card className=\"lg:col-span-3 border-border/80 bg-black/40 backdrop-blur-md overflow-hidden shadow-2xl\">
          <CardHeader className=\"pb-2 border-b border-white/5 flex flex-row items-center justify-between\">
            <div className=\"flex items-center gap-3\">
               <div className=\"p-2 bg-emerald-500/10 rounded-lg\">
                 <BarChart3 className=\"size-5 text-emerald-500\" />
               </div>
               <div>
                 <CardTitle className=\"text-lg font-bold\">Pro Terminal</CardTitle>
                 <CardDescription className=\"text-[10px] uppercase tracking-[0.2em] font-mono\">Real-time Interactive Analysis</CardDescription>
               </div>
            </div>
            {selected && (
              <div className=\"text-right\">
                <div className=\"flex items-center gap-2\">
                  <span className=\"text-sm font-mono bg-muted px-2 py-0.5 rounded\">{selected.symbol}</span>
                  <Badge className={selected.direction === 'buy' ? 'bg-emerald-500' : 'bg-rose-500'}>{selected.direction.toUpperCase()}</Badge>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className=\"h-[500px] p-0 bg-black/20 relative group\">
            {selected ? (
              <TradingViewWidget symbol={selected.symbol} />
            ) : (
              <div className=\"flex items-center justify-center h-full text-muted-foreground\">Initialize terminal...</div>
            )}
          </CardContent>
        </Card>

        {/* AI Insight Stack */}
        <div className=\"space-y-6\">
          <Card className=\"border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm\">
            <CardHeader className=\"pb-2\">
              <CardTitle className=\"text-sm flex items-center gap-2\">
                <Activity className=\"size-4 text-emerald-500\" /> AI Probability
              </CardTitle>
            </CardHeader>
            <CardContent>
               <div className=\"text-4xl font-black text-emerald-500\">
                 {selected ? (selected.probability * 100).toFixed(1) : \"--\"}%
               </div>
               <div className=\"mt-2 h-1.5 w-full bg-black/20 rounded-full overflow-hidden\">
                 <div className=\"h-full bg-emerald-500 transition-all duration-1000\" style={{ width: `${selected ? selected.probability * 100 : 0}%` }} />
               </div>
            </CardContent>
          </Card>

          <Card className=\"border-border/80 bg-card/30\">
            <CardHeader className=\"pb-2\">
              <CardTitle className=\"text-sm flex items-center gap-2\"><LayoutGrid className=\"size-4\" /> Market Intel</CardTitle>
            </CardHeader>
            <CardContent className=\"space-y-4\">
              <div className=\"grid grid-cols-2 gap-2 text-[10px] font-mono\">
                <div className=\"p-2 rounded bg-muted/50\">
                   <div className=\"text-muted-foreground\">RISK</div>
                   <div className=\"text-sm font-bold\">{selected ? (selected.riskScore * 100).toFixed(0) : \"--\"}%</div>
                </div>
                <div className=\"p-2 rounded bg-muted/50\">
                   <div className=\"text-muted-foreground\">GB CORE</div>
                   <div className=\"text-sm font-bold text-blue-400\">{selected ? (selected.ensembleGb * 100).toFixed(1) : \"--\"}%</div>
                </div>
              </div>
              <div className=\"text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-emerald-500/30 pl-2\">
                Ensemble includes LSTM Neural Network & Gradient Boosting models with 40+ technical features.
              </div>
            </CardContent>
          </Card>

          <Card className=\"border-border/40 bg-card/10\">
             <CardHeader className=\"p-3\">
               <CardTitle className=\"text-xs flex items-center gap-2\"><Globe className=\"size-3\" /> Market Overview</CardTitle>
             </CardHeader>
             <CardContent className=\"p-0\">
                {/* Simplified Heatmap Placeholder */}
                <div className=\"grid grid-cols-4 gap-1 p-2\">
                   {signals.slice(0, 12).map(s => (
                     <div key={s.id} className={`h-8 rounded ${s.direction === 'buy' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-rose-500/20 border border-rose-500/30'} flex items-center justify-center text-[8px] font-bold`}>
                       {s.symbol.split(\"-\")[0].split(\"=\")[0]}
                     </div>
                   ))}
                </div>
             </CardContent>
          </Card>
        </div>
      </div>

      {/* Filter Terminal */}
      <div className=\"flex flex-wrap items-center gap-3 p-2 bg-muted/20 rounded-lg border border-border/40\">
         <div className=\"flex-1 min-w-[300px]\">
            <input 
              className=\"w-full bg-transparent border-none focus:ring-0 text-sm font-mono placeholder:text-muted-foreground/50 h-10 px-4\" 
              placeholder=\"COMMAND LINE SEARCH (SYMBOL, ASSET...)\"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
            />
         </div>
         <select 
           className=\"bg-background border-none text-xs font-bold uppercase tracking-widest h-10 rounded-md px-4 focus:ring-1 focus:ring-emerald-500\"
           value={confidenceFilter}
           onChange={(e) => setConfidenceFilter(e.target.value as any)}
         >
           <option value=\"all\">All Confidence Levels</option>
           <option value=\"high\">High Only</option>
           <option value=\"medium\">Medium+</option>
         </select>
      </div>

      {/* Signal Grid */}
      <Card className=\"border-border/80 shadow-2xl bg-black/20\">
        <CardContent className=\"p-0 overflow-x-auto\">
          <Table>
            <TableHeader className=\"bg-muted/50\">
              <TableRow className=\"hover:bg-transparent border-none\">
                <TableHead className=\"text-[10px] uppercase font-black\">Instrument</TableHead>
                <TableHead className=\"text-[10px] uppercase font-black\">Action</TableHead>
                <TableHead className=\"text-[10px] uppercase font-black\">AI Prob</TableHead>
                <TableHead className=\"text-[10px] uppercase font-black\">Rating</TableHead>
                <TableHead className=\"text-[10px] uppercase font-black\">Risk</TableHead>
                <TableHead className=\"text-[10px] uppercase font-black\">Core</TableHead>
                <TableHead className=\"text-[10px] uppercase font-black text-emerald-500\">Take Profit</TableHead>
                <TableHead className=\"text-[10px] uppercase font-black text-rose-500\">Stop Loss</TableHead>
                <TableHead className=\"text-[10px] uppercase font-black\">TF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSignals.map((s) => (
                <TableRow 
                  key={s.id} 
                  className={`group cursor-pointer border-white/5 transition-all ${selected?.id === s.id ? \"bg-emerald-500/10\" : \"hover:bg-white/5\"}`}
                  onClick={() => setSelected(s)}
                >
                  <SignalCells s={s} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
