"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Moon, Sun, Languages } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { t, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-sm text-primary">
            TA
          </span>
          <span className="hidden sm:inline">TradeAI Signals</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#demo" className="hover:text-foreground">
            {t("nav.features")}
          </a>
          <a href="#pricing" className="hover:text-foreground">
            {t("nav.pricing")}
          </a>
          <a href="#faq" className="hover:text-foreground">
            {t("nav.faq")}
          </a>
                  <Link href="/signals" className="hover:text-foreground flex items-center gap-1">
          Sinais
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
        </Link>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Language">
                  <Languages className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale("pt")}>Português</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("en")}>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:inline" />
          </Button>
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">{t("nav.login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">{t("nav.start")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
