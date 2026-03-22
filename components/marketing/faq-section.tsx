"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";

const faqPt = [
  {
    q: "Os resultados são garantidos?",
    a: "Não. Trading envolve risco. Os números apresentados são ilustrativos e baseados em modelos simulados.",
  },
  {
    q: "Como funciona o trial de 7 dias?",
    a: "Nos planos pagos, o Stripe pode aplicar período de trial conforme configuração do produto. Cancele antes do fim se não quiser continuar.",
  },
  {
    q: "O que inclui o Premium?",
    a: "Sinais ilimitados, alertas via Telegram, backtest histórico do ensemble e prioridade de latência.",
  },
  {
    q: "Os dados são em tempo real?",
    a: "O dashboard usa Supabase Realtime quando configurado; preços podem ser enriquecidos via Yahoo Finance quando disponível.",
  },
];

export function FaqSection() {
  const { t, locale } = useI18n();
  const items = faqPt;

  return (
    <section id="faq" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("faq.title")}
        </h2>
        <Accordion className="w-full">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/80">
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {locale === "en" ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            English FAQ copy mirrors Portuguese — customize in faq-section.tsx.
          </p>
        ) : null}
      </div>
    </section>
  );
}
