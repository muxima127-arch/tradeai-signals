import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let customerId: string | null = null;

    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subRow?.stripe_customer_id) {
      customerId = subRow.stripe_customer_id;
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle();
      customerId = profile?.stripe_customer_id ?? null;
    }

    if (!customerId) {
      return NextResponse.json({ error: "Sem cliente Stripe" }, { status: 400 });
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin.replace(/\/$/, "")}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Portal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
