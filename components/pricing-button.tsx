"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PricingButtonProps {
  planId: string;
  stripe: "basic" | "premium" | null;
  isLoggedIn: boolean;
  highlight: boolean;
}

export function PricingButton({ planId, stripe, isLoggedIn, highlight }: PricingButtonProps) {
  const [loading, setLoading] = useState(false);

  // Trial plan — always go to signup
  if (planId === "trial" || !stripe) {
    return (
      <Button asChild className="w-full rounded-xl" variant="outline">
        <Link href="/signup">Começar grátis</Link>
      </Button>
    );
  }

  // Paid plan + user NOT logged in → go to signup with plan param
  if (!isLoggedIn) {
    return (
      <Button
        asChild
        className="w-full rounded-xl"
        variant={highlight ? "default" : "outline"}
      >
        <Link href={`/signup?plan=${stripe}`}>Subscrever</Link>
      </Button>
    );
  }

  // Paid plan + user IS logged in → direct Stripe checkout
  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: stripe }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
      } else {
        toast.error(json.error ?? "Erro ao iniciar checkout");
      }
    } catch {
      toast.error("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      className="w-full rounded-xl"
      variant={highlight ? "default" : "outline"}
      disabled={loading}
      onClick={() => void handleCheckout()}
    >
      {loading ? "A processar..." : "Subscrever"}
    </Button>
  );
}
