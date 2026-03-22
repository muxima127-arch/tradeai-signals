import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Preços — TradeAI Signals",
};

const plans = [
  {
    id: "trial",
    price: "€0",
    period: "7 dias",
    features: ["5 sinais/dia", "Dashboard", "Email support"],
    highlight: false,
    href: "/signup",
    stripe: null,
  },
  {
    id: "basic",
    price: "€9",
    period: "mês",
    features: ["5 sinais/dia", "Alertas email", "Risk score", "Suporte prioritário"],
    highlight: false,
    href: "/signup?plan=basic",
    stripe: "basic",
  },
  {
    id: "premium",
    price: "€29",
    period: "mês",
    features: ["Sinais ilimitados", "Alertas Telegram", "Backtest histórico IA", "Prioridade máxima"],
    highlight: true,
    href: "/signup?plan=premium",
    stripe: "premium",
  },
];

const planLabels: Record<string, string> = {
  trial: "Trial / Free",
  basic: "Básico",
  premium: "Pro Premium",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; checkout?: string; cancelled?: string }>;
}) {
  const sp = await searchParams;
  const upgrade = sp.upgrade === "true";
  const cancelled = sp.checkout === "cancel";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Planos simples</h1>
        <p className="mt-3 text-muted-foreground">
          Trial de 7 dias em todos os planos pagos. Cancele quando quiser.
        </p>
      </div>

      {/* Banner de upgrade (pós-login sem subscrição) */}
      {upgrade && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-amber-300">Subscrição necessária</p>
            <p className="text-sm text-amber-300/70">
              Para aceder ao dashboard completo precisas de um plano ativo ou trial.
              Escolhe um plano abaixo — trial gratuito sem cartão.
            </p>
          </div>
        </div>
      )}

      {/* Banner checkout cancelado */}
      {cancelled && (
        <div className="mb-8 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          O checkout foi cancelado. Podes tentar novamente abaixo.
        </div>
      )}

      {/* Cards de planos */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={`relative flex flex-col border-border/80 ${
              p.highlight
                ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
                : "bg-card/50"
            }`}
          >
            {p.highlight && (
              <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground">
                Pro
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg">
                {planLabels[p.id]}
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">{p.price}</span>
                <span className="text-muted-foreground">
                  {" "}
                  {p.period ? `/ ${p.period}` : ""}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {p.features.map((f) => (
                <div key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button
                asChild
                className="w-full rounded-xl"
                variant={p.highlight ? "default" : "outline"}
              >
                <Link href={p.href}>
                  {p.id === "trial" ? "Começar grátis" : "Subscrever"}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* CTA extra pós-upgrade */}
      {upgrade && (
        <div className="mt-10 rounded-2xl border border-border/40 bg-muted/20 p-6 text-center">
          <Zap className="mx-auto mb-2 size-6 text-primary" />
          <p className="text-sm text-muted-foreground">
            Já tens conta?{" "}
            <Link href="/login" className="text-primary underline underline-offset-4 hover:no-underline">
              Entrar
            </Link>
            {" "}e escolhe o plano na área de conta.
          </p>
        </div>
      )}
    </div>
  );
}
