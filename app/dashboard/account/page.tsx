import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, CreditCard, Calendar, Check, X } from "lucide-react";

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
        <p className="text-muted-foreground mt-1">Gere a sua subscrição e configurações</p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="font-mono text-sm">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Subscrição Atual
          </CardTitle>
          <CardDescription>Detalhes do seu plano e faturação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{planName}</span>
                <Badge variant={planColor}>
                  {activeSub?.status || (isTrialActive ? "Trial" : "Inativo")}
                </Badge>
              </div>
              {activeSub && (
                <p className="text-sm text-muted-foreground mt-1">
                  Plano: {activeSub.plan_id.replace("price_", "").toUpperCase()}
                </p>
              )}
              {isTrialActive && trialEndsAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Trial termina em {new Date(trialEndsAt).toLocaleDateString("pt-PT")}
                </p>
              )}
            </div>
            {activeSub && (
              <form action={`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/customer-portal`} method="POST">
                <input type="hidden" name="customer_id" value={activeSub.stripe_customer_id || ""} />
                <Button type="submit" variant="outline" size="sm">
                  <CreditCard className="size-4 mr-2" />
                  Gerir Faturação
                </Button>
              </form>
            )}
          </div>

          {!activeSub && !isTrialActive && (
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Não tem uma subscrição ativa. Subscreva agora para aceder a todos os sinais de trading.
              </p>
              <Button asChild>
                <a href="/pricing">Ver Planos</a>
              </Button>
            </div>
          )}

          {activeSub && (
            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  Próxima renovação
                </label>
                <p className="text-sm font-mono mt-1">
                  {activeSub.current_period_end 
                    ? new Date(activeSub.current_period_end).toLocaleDateString("pt-PT")
                    : "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  Renovação automática
                </label>
                <p className="text-sm flex items-center gap-1.5 mt-1">
                  {activeSub.cancel_at_period_end ? (
                    <><X className="size-4 text-destructive" /> Cancelada</>
                  ) : (
                    <><Check className="size-4 text-emerald-500" /> Ativa</>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telegram Config */}
      <Card>
        <CardHeader>
          <CardTitle>Notificações Telegram</CardTitle>
          <CardDescription>
            Configure o Telegram para receber alertas de sinais em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.telegram_chat_id || profile?.telegram_user_id ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-emerald-500" />
                <span className="font-medium">Telegram conectado</span>
              </div>
              {profile.telegram_chat_id && (
                <p className="text-xs text-muted-foreground font-mono">
                  Chat ID: {profile.telegram_chat_id}
                </p>
              )}
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
