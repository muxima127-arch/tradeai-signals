"use client";
import { Button } from "@/components/ui/button";

interface PricingButtonProps {
  planId: string;
  stripe: "basic" | "premium" | null;
  isLoggedIn: boolean;
  highlight: boolean;
}

export function PricingButton({ planId, stripe, isLoggedIn, highlight }: PricingButtonProps) {
  // Trial plan
  if (planId === "trial" || !stripe) {
    return (
      <Button
        className="w-full rounded-xl"
        variant="outline"
        onClick={() => { window.location.href = isLoggedIn ? "/dashboard" : "/signup"; }}
      >
        Começar grátis
      </Button>
    );
  }

  // Paid plan - go to signup with plan param (works for both logged in and not)
  const signupUrl = isLoggedIn
    ? `/dashboard/signals?upgrade=${stripe}`
    : `/signup?plan=${stripe}`;

  return (
    <Button
      className="w-full rounded-xl"
      variant={highlight ? "default" : "outline"}
      onClick={() => { window.location.href = signupUrl; }}
    >
      Subscrever
    </Button>
  );
}
