import { Suspense } from "react";
import { SignalsDashboard } from "@/components/dashboard/signals-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Sinais",
  description: "Tabela de sinais em tempo real com ensemble IA.",
};

export default function SignalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sinais em tempo real</h1>
        <p className="text-sm text-muted-foreground">
          Ensemble Gradient Boosting + LSTM · dados Yahoo quando disponível · Supabase Realtime opcional
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <SignalsDashboard />
      </Suspense>
    </div>
  );
}
