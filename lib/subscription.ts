import type { SubscriptionTier } from "@/types/database";

const TRIAL_DAYS = 7;

export function isTrialActive(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

/** Max signals returned per request / visibility */
export function maxSignalsForTier(
  tier: SubscriptionTier,
  trialEndsAt: string | null
): number {
  if (tier === "premium") return Number.POSITIVE_INFINITY;
  if (isTrialActive(trialEndsAt)) return 50;
  if (tier === "basic") return 5;
  return 3;
}

export function canUseTelegramAlerts(tier: SubscriptionTier): boolean {
  return tier === "premium";
}

export { TRIAL_DAYS };
