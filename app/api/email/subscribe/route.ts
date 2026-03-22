import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  locale: z.enum(["pt", "en"]).optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? "TradeAI <onboarding@resend.dev>";

    if (!key) {
      return NextResponse.json({ ok: true, mode: "noop" });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(key);

    await resend.emails.send({
      from,
      to: process.env.RESEND_AUDIENCE_EMAIL ?? parsed.data.email,
      subject: `[TradeAI] Novo lead — ${parsed.data.email}`,
      html: `<p>Novo email capturado: <b>${parsed.data.email}</b> (${parsed.data.locale ?? "pt"})</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
