"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.55_0.15_155/0.25),transparent)]" />
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="secondary" className="mb-4 gap-1 border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
          <Sparkles className="size-3" />
          {t("hero.badge")}
        </Badge>
        <h1 className="font-heading text-balance text-3xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          {t("hero.title")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {t("hero.sub")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild className="gap-2 rounded-xl px-6">
            <Link href="/signup">
              {t("hero.cta")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="rounded-xl">
            <a href="#demo">{t("hero.cta2")}</a>
          </Button>
        </div>
        <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { k: "hero.stat1", v: "78%" },
            { k: "hero.stat2", v: "+15%" },
            { k: "hero.stat3", v: "\u003c200ms" },
          ].map((row) => (
            <div
              key={row.k}
              className="rounded-2xl border border-border/80 bg-card/50 px-4 py-4 backdrop-blur-sm"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t(row.k)}
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{row.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
