import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .limit(1);

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id, telegram_user_id, trial_ends_at")
    .eq("id", user.id)
    .maybeSingle();

  const activeSub = subscriptions?.[0];
  const trialEndsAt = profile?.trial_ends_at;
  const isTrialActive = trialEndsAt && new Date(trialEndsAt) > new Date();

  const planName = activeSub
    ? (activeSub.plan_id === "price_basic" ? "Starter" : "Pro")
    : (isTrialActive ? "Trial" : "Sem Plano");

  const planColor = activeSub?.status === "active"
    ? "default"
    : isTrialActive
    ? "secondary"
    : "destructive";

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Minha Conta</h1>
        <p className="text-sm text-muted-foreground">Gerencie sua assinatura e configurações</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assinatura Atual</CardTitle>
          <CardDescription>Status da sua subscrição no TradeAI Signals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Plano</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">{planName}</span>
                <Badge variant={planColor as any}>
                  {activeSub?.status || (isTrialActive ? "Trialing" : "Inactive")}
                </Badge>
              </div>
            </div>
            {activeSub && (
              <form action="/api/stripe/portal" method="POST">
                <Button type="submit">Gerir Faturação</Button>
              </form>
            )}
          </div>

          {activeSub?.current_period_end && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Renovação automática</p>
              <p className="text-sm mt-1">
                {activeSub.cancel_at_period_end ? (
                  <><span className="text-destructive">Cancelado</span> em {new Date(activeSub.current_period_end).toLocaleDateString("pt-PT")}</>
                ) : (
                  <>{new Date(activeSub.current_period_end).toLocaleDateString("pt-PT")}</>
                )}
              </p>
            </div>
          )}

          {!activeSub && !isTrialActive && (
            <div className="text-sm text-muted-foreground">
              <p>Ainda não configurou o Telegram. Contacte o suporte para ativar notificações.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Telegram</CardTitle>
          <CardDescription>Configure o Telegram para receber alertas de sinais em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.telegram_chat_id ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-500">✓</span>
                <span>Telegram conectado</span>
              </div>
              <p className="text-xs text-muted-foreground">Chat ID: {profile.telegram_chat_id}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ainda não configurou o Telegram. Contacte o suporte para ativar notificações.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
