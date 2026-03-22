import { NextResponse } from "next/server";
import { getStripe, PRICE_BASIC_EUR, PRICE_PREMIUM_EUR } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { price?: string };
    const priceId =
      body.price === "premium"
        ? PRICE_PREMIUM_EUR
        : body.price === "basic"
          ? PRICE_BASIC_EUR
          : null;

    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/signals?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      metadata: {
        supabase_user_id: user.id,
        plan: body.price === "premium" ? "premium" : "basic",
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          supabase_user_id: user.id,
          plan: body.price === "premium" ? "premium" : "basic",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
