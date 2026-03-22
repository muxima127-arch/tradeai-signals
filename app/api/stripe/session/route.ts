import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id") ?? searchParams.get("session_id");
    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "session_id inválido" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "subscription"],
    });

    const planMeta = session.metadata?.plan;
    const plan = planMeta === "premium" ? "premium" : planMeta === "basic" ? "basic" : "basic";

    const email =
      session.customer_email ??
      (typeof session.customer_details?.email === "string"
        ? session.customer_details.email
        : null) ??
      "";

    return NextResponse.json({
      plan,
      email,
      status: session.status,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
