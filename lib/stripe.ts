import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
                  apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return stripeSingleton;
}

/** Aceita STRIPE_PRICE_BASIC / PREMIUM ou nomes legados *_EUR. */
export const PRICE_BASIC_EUR =
  process.env.STRIPE_PRICE_BASIC_EUR ?? process.env.STRIPE_PRICE_BASIC ?? "";
export const PRICE_PREMIUM_EUR =
  process.env.STRIPE_PRICE_PREMIUM_EUR ?? process.env.STRIPE_PRICE_PREMIUM ?? "";
