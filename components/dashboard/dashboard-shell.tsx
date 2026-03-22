"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClientSafe } from "@/lib/supabase/client";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { Moon, Sun, LayoutDashboard, LogOut, CreditCard } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export function DashboardShell({
  email,
  tier,
  children,
}: {
  email: string | null;
  tier: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function signOut() {
    const supabase = createClientSafe();
    if (supabase) await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  async function openBilling() {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
      } else {
        toast.error(json.error ?? "Portal indisponível");
      }
    } catch {
      toast.error("Erro ao abrir portal");
    }
  }

  async function checkout(plan: "basic" | "premium") {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: plan }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
      } else {
        toast.error(json.error ?? "Checkout indisponível");
      }
    } catch {
      toast.error("Erro no checkout");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/dashboard/signals" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-xs text-primary">
              TA
            </span>
            <span className="hidden sm:inline">TradeAI</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/signals">
                <LayoutDashboard className="mr-1 size-4" />
                Signals
              </Link>
            </Button>
            {tier === "free" || tier === "basic" ? (
              <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={() => void checkout("premium")}>
                Upgrade
              </Button>
            ) : null}
            <ManageSubscriptionButton variant="outline" className="hidden sm:inline-flex" />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:inline" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="max-w-[200px] truncate">
                    {email ?? "—"}
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Plano: {tier}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void openBilling()}>
                  <CreditCard className="mr-2 size-4" />
                  Faturação
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
