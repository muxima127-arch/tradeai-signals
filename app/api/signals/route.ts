import { NextResponse } from "next/server";
import { getIASignalsResult, signalToJsonRow } from "@/lib/ia-signals";
import { maxSignalsForTier } from "@/lib/subscription";
import { broadcastToSubscribers } from "@/lib/telegram";
import { createClientSafe, createServiceRoleClient } from "@/lib/supabase/server";
import type { SubscriptionTier } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClientSafe();
  let tier: SubscriptionTier = "free";
  let trialEndsAt: string | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, trial_ends_at")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        tier = (profile.subscription_tier as SubscriptionTier) ?? "free";
        trialEndsAt = profile.trial_ends_at;
      }
    }
  }

  const cap = maxSignalsForTier(tier, trialEndsAt);
  const fullResult = await getIASignalsResult({ limit: 5 });
  const full = fullResult.signals;
  const signals = Number.isFinite(cap) ? full.slice(0, cap) : full;

  if (supabase && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const admin = createServiceRoleClient();
        for (const s of signals.slice(0, 2)) {
          await admin.from("signals").insert(signalToJsonRow(s, user.id));
        }
      }
    } catch {
      /* optional persistence */
    }
  }

  const m = fullResult.meta;
  const yahooConnected =
    m.engine === "python" || m.dataSource === "yahoo";

  const top = signals[0];
  if (top) {
    const g = globalThis as { __tradeaiTgBroadcast?: number };
    const now = Date.now();
    const throttleMs = 10 * 60 * 1000;
    if (!g.__tradeaiTgBroadcast || now - g.__tradeaiTgBroadcast >= throttleMs) {
      g.__tradeaiTgBroadcast = now;
      void broadcastToSubscribers(top).catch(() => {});
    }
  }

  return NextResponse.json({
    signals,
    meta: {
      tier,
      engine: m.engine,
      dataSource: m.dataSource,
      pythonAttempted: m.pythonAttempted,
      yahooConnected,
    },
  });
}
