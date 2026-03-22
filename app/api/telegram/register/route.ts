import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canUseTelegramAlerts } from "@/lib/subscription";
import type { SubscriptionTier } from "@/types/database";

const bodySchema = z.object({
  chatId: z.string().min(4),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chat id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    const tier = (profile?.subscription_tier as SubscriptionTier) ?? "free";
    if (!canUseTelegramAlerts(tier)) {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    await supabase
      .from("profiles")
      .update({ telegram_chat_id: parsed.data.chatId })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
