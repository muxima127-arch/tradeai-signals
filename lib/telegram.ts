const TG_API = "https://api.telegram.org";

export async function sendTelegramMessage(
  chatId: string,
  text: string
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
        parse_mode: "HTML",
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
