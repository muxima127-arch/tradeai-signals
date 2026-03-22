import { NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationEmail } from "@/lib/email";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Reenvia email de confirmação (Resend + link Supabase generateLink).
 * Requer email + password do registo (necessário para o tipo "signup").
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email e password são obrigatórios" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email_confirmed_at) {
      return NextResponse.json({ error: "Email já confirmado" }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "signup",
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (linkErr || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkErr?.message ?? "Não foi possível gerar o link" },
        { status: 400 }
      );
    }

    const r = await sendVerificationEmail(parsed.data.email, linkData.properties.action_link);
    if (!r.ok) {
      return NextResponse.json({ error: r.error ?? "Resend" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
