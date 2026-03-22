export type SubscriptionTier = "free" | "basic" | "premium";

/** Linha em `public.subscriptions` (Stripe). */
export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string;
  plan: "basic" | "premium";
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  telegram_chat_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

export interface SignalRow {
  id: string;
  created_at: string;
  user_id: string | null;
  asset: string;
  symbol: string;
  direction: "buy" | "sell";
  probability: number;
  tp: number;
  sl: number;
  risk_score: number;
  ensemble_gb: number;
  ensemble_lstm: number;
  backtest_win_rate: number;
  timeframe: string;
  meta: Record<string, unknown>;
}
