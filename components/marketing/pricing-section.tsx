"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    id: "trial",
    price: "€0",
    period: "7 dias",
    features: ["5 sinais/dia", "Dashboard", "Email support"],
    highlight: false,
    href: "/signup",
  },
  {
    id: "basic",
    price: "€9",
    stripe: "basic" as const,
    features: ["5 sinais/dia", "Alertas email", "Risk score"],
    highlight: false,
    href: "/signup?plan=basic",
  },
  {
    id: "premium",
    price: "€29",
    stripe: "premium" as const,
    features: ["Sinais ilimitados", "Alertas Telegram", "Backtest histórico IA", "Prioridade"],
    highlight: true,
    href: "/signup?plan=premium",
  },
];

export function PricingSection() {
  const { t } = useI18n();

  return (
    <section id="pricing" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("pricing.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("pricing.sub")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <Card
              key={p.id}
              className={`relative flex flex-col border-border/80 ${
                p.highlight ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10" : "bg-card/50"
              }`}
            >
              {p.highlight ? (
                <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground">Pro</Badge>
              ) : null}
              <CardHeader>
                <CardTitle className="text-lg">
                  {p.id === "trial"
                    ? t("pricing.free")
                    : p.id === "basic"
                      ? t("pricing.basic")
                      : t("pricing.premium")}
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-semibold text-foreground">{p.price}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    {p.period ? `/ ${p.period}` : t("pricing.mo")}
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
                <Button asChild className="w-full rounded-xl" variant={p.highlight ? "default" : "outline"}>
                  <Link href={p.href}>{t("pricing.cta")}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
