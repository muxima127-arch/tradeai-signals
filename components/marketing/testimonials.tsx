"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";

const items = [
  {
    name: "Miguel R.",
    role: "Day trader · Lisboa",
    text: "Os sinais no Brent alinharam com o meu plano de risco. O risk score por trade é ouro.",
    initials: "MR",
  },
  {
    name: "Elena V.",
    role: "Forex CFDs · Madrid",
    text: "Interface nível TradingView, ensemble GB+LSTM dá confiança para escalar posição.",
    initials: "EV",
  },
  {
    name: "João P.",
    role: "Índices · Porto",
    text: "Alertas rápidos e backtest histórico ajudam a filtrar setups fracos. Recomendo Premium.",
    initials: "JP",
  },
];

export function Testimonials() {
  const { t } = useI18n();

  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("testimonials.title")}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((x) => (
            <Card key={x.name} className="border-border/80 bg-card/40">
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{x.text}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/15 text-primary">{x.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{x.name}</p>
                    <p className="text-xs text-muted-foreground">{x.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
