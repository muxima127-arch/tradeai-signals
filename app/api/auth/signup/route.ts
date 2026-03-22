import { NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationEmail, sendWelcomeTrialEmail } from "@/lib/email";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  plan: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { email, password, name } = parsed.data;
    const admin = createServiceRoleClient();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name: name ?? "", plan: parsed.data.plan ?? "trial" },
    });

    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Erro ao criar conta" },
        { status: 400 }
      );
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
    });

    if (linkErr || !linkData?.properties?.action_link) {
      await sendWelcomeTrialEmail(email, name).catch(() => {});
      return NextResponse.json(
        { ok: true, needsVerification: true, warning: "Link de confirmação indisponível" },
        { status: 201 }
      );
    }

    const actionLink = linkData.properties.action_link;
    await sendVerificationEmail(email, actionLink).catch(() => {});
    await sendWelcomeTrialEmail(email, name).catch(() => {});

    try {
      const { track } = await import("@vercel/analytics/server");
      await track("signup", { plan: parsed.data.plan ?? "trial" });
    } catch {
      /* analytics opcional */
    }

    return NextResponse.json({ ok: true, needsVerification: true }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
