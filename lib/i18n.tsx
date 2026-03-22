"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Locale = "pt" | "en";

type Dict = Record<string, string>;

const PT: Dict = {
  "nav.features": "Funcionalidades",
  "nav.pricing": "Preços",
  "nav.faq": "FAQ",
  "nav.login": "Entrar",
  "nav.start": "Começar grátis",
  "hero.badge": "IA ensemble · GB + LSTM",
  "hero.title": "Sinais IA precisão 78% — Ganhe +15% mês médio",
  "hero.sub":
    "O motor #1 para day traders em Brent, ouro, US500 e Forex CFDs. Backtest histórico, risk score e alertas em tempo real.",
  "hero.cta": "Trial 7 dias — sem cartão",
  "hero.cta2": "Ver demo ao vivo",
  "hero.stat1": "Precisão média (sim.)",
  "hero.stat2": "Retorno médio mensal (sim.)",
  "hero.stat3": "Latência sinais",
  "demo.title": "Dashboard interativo",
  "demo.sub": "Gráficos estilo TradingView com dados mock — mude o ativo e veja o ensemble em ação.",
  "pricing.title": "Planos simples",
  "pricing.sub": "Trial de 7 dias em todos os planos pagos. Cancele quando quiser.",
  "pricing.free": "Trial / Free",
  "pricing.basic": "Básico",
  "pricing.premium": "Premium",
  "pricing.mo": "/mês",
  "pricing.cta": "Subscrever",
  "pricing.current": "Plano atual",
  "testimonials.title": "Traders que confiam",
  "faq.title": "Perguntas frequentes",
  "footer.privacy": "Privacidade",
  "footer.terms": "Termos",
  "footer.cookies": "Cookies",
  "footer.contact": "Contacto DPO",
  "footer.rights": "Todos os direitos reservados.",
  "footer.disclaimer":
    "Aviso: CFDs são instrumentos complexos com elevado risco. Este site não constitui aconselhamento financeiro. Dados de performance são ilustrativos.",
  "gdpr.note":
    "Tratamento de dados conforme RGPD (UE). Responsável: TradeAI Signals. Base legal: execução de contrato e consentimento para marketing opcional.",
};

const EN: Dict = {
  "nav.features": "Features",
  "nav.pricing": "Pricing",
  "nav.faq": "FAQ",
  "nav.login": "Sign in",
  "nav.start": "Start free",
  "hero.badge": "Ensemble AI · GB + LSTM",
  "hero.title": "AI signals 78% accuracy — +15% avg monthly return",
  "hero.sub":
    "The #1 engine for day traders on Brent, gold, US500 and Forex CFDs. Historical backtest, risk score and real-time alerts.",
  "hero.cta": "7-day trial — no card",
  "hero.cta2": "Live demo",
  "hero.stat1": "Avg. accuracy (sim.)",
  "hero.stat2": "Avg. monthly return (sim.)",
  "hero.stat3": "Signal latency",
  "demo.title": "Interactive dashboard",
  "demo.sub": "TradingView-style charts with mock data — switch asset and watch the ensemble.",
  "pricing.title": "Simple pricing",
  "pricing.sub": "7-day trial on paid tiers. Cancel anytime.",
  "pricing.free": "Trial / Free",
  "pricing.basic": "Basic",
  "pricing.premium": "Premium",
  "pricing.mo": "/mo",
  "pricing.cta": "Subscribe",
  "pricing.current": "Current plan",
  "testimonials.title": "Trusted by traders",
  "faq.title": "FAQ",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.cookies": "Cookies",
  "footer.contact": "DPO contact",
  "footer.rights": "All rights reserved.",
  "footer.disclaimer":
    "Risk warning: CFDs are complex instruments with high risk. This is not financial advice. Performance figures are illustrative.",
  "gdpr.note":
    "Data processing under GDPR. Controller: TradeAI Signals. Lawful basis: contract and optional marketing consent.",
};

const DICTS: Record<Locale, Dict> = { pt: PT, en: EN };

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt");

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "pt" ? "pt" : "en";
      try {
        localStorage.setItem("tradeai-locale", l);
      } catch {
        /* ignore */
      }
    }
  }, []);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("tradeai-locale") as Locale | null;
      if (saved === "en" || saved === "pt") setLocaleState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string) => DICTS[locale][key] ?? DICTS.en[key] ?? key,
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
