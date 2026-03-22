import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { getStripe, PRICE_BASIC_EUR, PRICE_PREMIUM_EUR } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SubscriptionTier } from "@/types/database";
import type Stripe from "stripe";

export const runtime = "nodejs";

function tierFromPriceId(priceId: string | undefined): SubscriptionTier | null {
  if (!priceId) return null;
  if (priceId === PRICE_PREMIUM_EUR) return "premium";
  if (priceId === PRICE_BASIC_EUR) return "basic";
  return null;
}

function planFromTier(t: SubscriptionTier): "basic" | "premium" {
  return t === "premium" ? "premium" : "basic";
}

async function syncProfileTier(sub: Stripe.Subscription) {
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

async function upsertSubscriptionRow(sub: Stripe.Subscription) {
  const userId = sub.metadata?.supabase_user_id;
  if (!userId) return;

  const priceId = sub.items.data[0]?.price?.id;
  let tier = tierFromPriceId(priceId) ?? (sub.metadata?.plan as SubscriptionTier | null);
  if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
    tier = "free";
  } else if ((sub.status === "active" || sub.status === "trialing") && !tier) {
    tier = "basic";
  }
  if (!tier || tier === "free") {
    const admin = createServiceRoleClient();
    await admin.from("subscriptions").delete().eq("stripe_subscription_id", sub.id);
    return;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const admin = createServiceRoleClient();
  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan: planFromTier(tier),
      status: sub.status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
}

async function sendWelcomeForSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.supabase_user_id;
  if (!userId) return;

  const priceId = sub.items.data[0]?.price?.id;
  const tier = tierFromPriceId(priceId) ?? (sub.metadata?.plan as SubscriptionTier | undefined);
  if (!tier || tier === "free") return;

  const stripe = getStripe();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !("email" in customer) || !customer.email) return;

    const planLabel = tier === "premium" ? "Premium" : "Básico";
    const name =
      "name" in customer && customer.name
        ? customer.name
        : customer.email?.split("@")[0] ?? undefined;

    await sendWelcomeEmail(customer.email, name, planLabel);
  } catch {
    /* opcional */
  }
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
          await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
        }
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscriptionRow(sub);
          await syncProfileTier(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscriptionRow(sub);
        await syncProfileTier(sub);
        if (event.type === "customer.subscription.created") {
          await sendWelcomeForSubscription(sub);
          try {
            const priceId = sub.items.data[0]?.price?.id;
            const tier = tierFromPriceId(priceId) ?? (sub.metadata?.plan as SubscriptionTier | undefined);
            if (tier && tier !== "free") {
              const { track } = await import("@vercel/analytics/server");
              await track("subscription_created", { plan: tier });
            }
          } catch {
            /* analytics opcional */
          }
        }
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
