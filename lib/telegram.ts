import { createServiceRoleClient } from "@/lib/supabase/server";
import type { GeneratedSignal } from "@/lib/ia-signals-types";

const TG_API = "https://api.telegram.org";

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }
  try {
    const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
      next: { revalidate: 0 },
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      return { ok: false, error: data.description ?? "Telegram API error" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export function formatSignalAlert(signal: {
  asset: string;
  direction: string;
  probability: number;
  tp: number;
  sl: number;
  riskScore: number;
  timeframe: string;
}): string {
  return [
    `<b>TradeAI Signals</b> — ${signal.asset}`,
    `${signal.direction.toUpperCase()} · TF ${signal.timeframe}`,
    `Prob. IA: ${(signal.probability * 100).toFixed(1)}%`,
    `TP: ${signal.tp} | SL: ${signal.sl}`,
    `Risk score: ${signal.riskScore}/100`,
  ].join("\n");
}

/** Alerta em PT para Markdown (Telegram). */
export function sendSignalAlertHtml(signal: GeneratedSignal): string {
  const conf = Math.round(signal.probability * 100);
  const risk100 = Math.round(signal.riskScore * 100);
  const ts = new Date(signal.createdAt).toLocaleString("pt-PT");
  return [
    `🎯 <b>Novo Sinal TradeAI</b>`,
    `📊 Ativo: ${signal.symbol} (${signal.asset})`,
    `📈 Direção: ${signal.direction.toUpperCase()}`,
    `💪 Confiança: ${conf}%`,
    `⚠️ Risk Score: ${risk100}/100`,
    `⏰ ${ts}`,
  ].join("\n");
}

export async function sendSignalAlert(
  chatId: string,
  signal: GeneratedSignal
): Promise<{ ok: boolean; error?: string }> {
  const text = sendSignalAlertHtml(signal);
  return sendTelegramMessage(chatId, text, "HTML");
}

/** Premium com telegram_chat_id — alerta em todos os chats. */
export async function broadcastToSubscribers(signal: GeneratedSignal): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    const { data: rows } = await admin
      .from("profiles")
      .select("telegram_chat_id")
      .eq("subscription_tier", "premium")
      .not("telegram_chat_id", "is", null);

    if (!rows?.length) return;

    const seen = new Set<string>();
    for (const row of rows) {
      const id = row.telegram_chat_id as string | null;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      void sendSignalAlert(id, signal).catch(() => {});
    }
  } catch {
    /* opcional */
  }
}
