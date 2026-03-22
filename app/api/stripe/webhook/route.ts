import { NextResponse } from "next/server";
import { getStripe, PRICE_BASIC_EUR, PRICE_PREMIUM_EUR } from "@/lib/stripe";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SubscriptionTier } from "@/types/database";

export const runtime = "nodejs";

function tierFromPriceId(priceId: string | undefined): SubscriptionTier | null {
  if (!priceId) return null;
  if (priceId === PRICE_PREMIUM_EUR) return "premium";
  if (priceId === PRICE_BASIC_EUR) return "basic";
  return null;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.supabase_user_id;
  if (!userId) return;

  const priceId = sub.items.data[0]?.price?.id;
  let tier = tierFromPriceId(priceId) ?? (sub.metadata?.plan as SubscriptionTier | undefined);

  if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
    tier = "free";
  } else if (sub.status === "active" || sub.status === "trialing") {
    if (!tier) tier = "basic";
  }

  if (!tier) tier = "free";

  const admin = createServiceRoleClient();
  await admin
    .from("profiles")
    .update({
      subscription_tier: tier,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    })
    .eq("id", userId);
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (userId && customerId) {
          const admin = createServiceRoleClient();
          await admin
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler error", e);
    return NextResponse.json({ received: true, error: "handler" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
