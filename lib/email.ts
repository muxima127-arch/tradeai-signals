import { Resend } from "resend";

const fromDefault = process.env.RESEND_FROM_EMAIL ?? "TradeAI <onboarding@resend.dev>";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function baseLayout(inner: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradeai-signals.vercel.app";
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#141414;border:1px solid #262626;border-radius:16px;padding:32px;">
        <tr><td>
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:#22c55e22;color:#4ade80;font-weight:800;font-size:18px;">TA</div>
          <div style="height:24px;"></div>
          ${inner}
          <p style="margin:32px 0 0;font-size:12px;color:#737373;">
            Precisa de ajuda? <a href="mailto:suporte@tradeai.app" style="color:#86efac;">suporte@tradeai.app</a>
            · <a href="${appUrl}" style="color:#86efac;">tradeai-signals.vercel.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(
  email: string,
  name: string | undefined,
  planLabel: string
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY em falta" };
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradeai-signals.vercel.app";
  const greet = name?.trim() ? `Olá, ${name.trim()}` : "Olá";
  try {
    const { error } = await resend.emails.send({
      from: fromDefault,
      to: email,
      subject: `Bem-vindo ao TradeAI Signals — plano ${planLabel}`,
      html: baseLayout(`
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">${greet}!</h1>
        <p style="margin:0 0 20px;line-height:1.6;color:#a3a3a3;">
          A tua subscrição <strong style="color:#fafafa;">${planLabel}</strong> está ativa. Tens acesso ao dashboard com sinais IA, risk score e alertas.
        </p>
        <a href="${appUrl}/dashboard/signals" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#052e16;text-decoration:none;border-radius:12px;font-weight:600;">Aceder ao Dashboard</a>
      `),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Resend error" };
  }
}

export async function sendWelcomeTrialEmail(
  email: string,
  name: string | undefined
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY em falta" };
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradeai-signals.vercel.app";
  const greet = name?.trim() ? `Olá, ${name.trim()}` : "Olá";
  try {
    const { error } = await resend.emails.send({
      from: fromDefault,
      to: email,
      subject: "Bem-vindo ao TradeAI Signals — trial de 7 dias",
      html: baseLayout(`
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">${greet}!</h1>
        <p style="margin:0 0 20px;line-height:1.6;color:#a3a3a3;">
          A tua conta foi criada com <strong style="color:#fafafa;">trial de 7 dias</strong> (sem cartão). Explora o dashboard e os sinais em tempo real.
        </p>
        <a href="${appUrl}/dashboard/trial" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#052e16;text-decoration:none;border-radius:12px;font-weight:600;">Aceder ao Dashboard</a>
      `),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Resend error" };
  }
}

export async function sendVerificationEmail(
  email: string,
  confirmationUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY em falta" };
  }
  try {
    const { error } = await resend.emails.send({
      from: fromDefault,
      to: email,
      subject: "Confirma o teu email — TradeAI Signals",
      html: baseLayout(`
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">Confirma o teu email</h1>
        <p style="margin:0 0 20px;line-height:1.6;color:#a3a3a3;">
          Clica no botão abaixo para ativar a conta <strong style="color:#fafafa;">TradeAI Signals</strong> e começar a receber sinais IA.
        </p>
        <a href="${confirmationUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#eff6ff;text-decoration:none;border-radius:12px;font-weight:600;">Confirmar email</a>
        <p style="margin:24px 0 0;font-size:13px;color:#737373;">Se não criaste conta, ignora este email.</p>
      `),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Resend error" };
  }
}
