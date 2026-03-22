"use client";
import { Button } from "@/components/ui/button";

const PAYMENT_LINKS: Record<string, string> = {
  basic: "https://buy.stripe.com/test_00weVe1rTg56C3mc00fn000",
  premium: "https://buy.stripe.com/test_28El4o9Yp9GI8Rac00fn001",
};

interface PricingButtonProps {
  planId: string;
  stripe: "basic" | "premium" | null;
  isLoggedIn: boolean;
  highlight: boolean;
}

export function PricingButton({ planId, stripe, isLoggedIn, highlight }: PricingButtonProps) {
  // Trial plan - always go to signup
  if (planId === "trial" || !stripe) {
    return (
      <Button
        className="w-full rounded-xl"
        variant="outline"
        onClick={() => { window.location.href = "/signup"; }}
      >
        Começar grátis
      </Button>
    );
  }

  // Paid plan - user NOT logged in: go to signup with plan param
  if (!isLoggedIn) {
    return (
      <Button
        className="w-full rounded-xl"
        variant={highlight ? "default" : "outline"}
        onClick={() => { window.location.href = `/signup?plan=${stripe}`; }}
      >
        Subscrever
      </Button>
    );
  }

  // Paid plan - user IS logged in: go directly to Stripe Payment Link
  const paymentUrl = PAYMENT_LINKS[stripe];
  return (
    <Button
      className="w-full rounded-xl"
      variant={highlight ? "default" : "outline"}
      onClick={() => { window.location.href = paymentUrl; }}
    >
      Subscrever
    </Button>
  );
}
