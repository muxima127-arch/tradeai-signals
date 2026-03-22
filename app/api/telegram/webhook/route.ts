import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TG_API = "https://api.telegram.org";

export async function POST(req: Request) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret) {
      const token = req.headers.get("x-telegram-bot-api-secret-token");
      if (token !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const update = (await req.json()) as {
      message?: { chat?: { id: number }; text?: string };
    };

    const msg = update.message;
    if (!msg?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(msg.chat.id);
    const text = (msg.text ?? "").trim();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ ok: true });
    }

    const admin = createServiceRoleClient();

    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const emailArg = parts[1]?.includes("@") ? parts[1] : null;

      if (emailArg) {
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("email", emailArg.toLowerCase())
          .maybeSingle();

        if (profile?.id) {
          await admin.from("profiles").update({ telegram_chat_id: chatId }).eq("id", profile.id);
        }
      }

      await fetch(`${TG_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            emailArg && emailArg.includes("@")
              ? "Conta ligada. Receberás alertas Premium aqui."
              : "Usa /start o_teu@email.com para ligar a conta TradeAI.",
        }),
      });
      return NextResponse.json({ ok: true });
    }

    if (text === "/stop") {
      await admin.from("profiles").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId);
      await fetch(`${TG_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Notificações desativadas. Usa /start para voltar a ligar.",
        }),
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
