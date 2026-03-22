"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { EmailCapture } from "@/components/marketing/email-capture";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const defaultOrigin =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://tradeai-signals.vercel.app";

export function Footer() {
  const { t, locale } = useI18n();
  const shareUrl = defaultOrigin;
  const shareText =
    locale === "pt"
      ? "TradeAI Signals — sinais IA para day trading"
      : "TradeAI Signals — AI signals for day trading";

  return (
    <footer className="border-t border-border/60 bg-muted/20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-sm font-medium">{locale === "pt" ? "Newsletter" : "Newsletter"}</p>
          <EmailCapture />
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" asChild>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-4" />
              Telegram
            </a>
          </Button>
        </div>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">{t("gdpr.note")}</p>
        <p className="text-center text-xs text-muted-foreground">{t("footer.disclaimer")}</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            {t("footer.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("footer.terms")}
          </Link>
          <Link href="/cookies" className="hover:text-foreground">
            {t("footer.cookies")}
          </Link>
          <a href="mailto:dpo@tradeai-signals.app" className="hover:text-foreground">
            {t("footer.contact")}
          </a>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TradeAI Signals. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
