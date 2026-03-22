"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function SuccessPage() {
  const [plan, setPlan] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    if (!id) {
      setErr("Falta session_id na URL.");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/stripe/session?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as { plan?: string; email?: string; error?: string };
        if (!res.ok) {
          setErr(json.error ?? "Erro ao carregar sessão");
          return;
        }
        if (!cancelled) {
          setPlan(json.plan ?? "basic");
          setEmail(json.email ?? null);
        }
      } catch {
        if (!cancelled) setErr("Erro de rede");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      {err ? (
        <p className="text-destructive">{err}</p>
      ) : plan == null && !err ? (
        <Loader2 className="size-10 animate-spin text-muted-foreground" />
      ) : (
        <>
          <CheckCircle2 className="size-16 text-emerald-500" aria-hidden />
          <h1 className="text-2xl font-semibold">Subscrição ativa!</h1>
          <p className="text-muted-foreground">
            Plano: <strong className="text-foreground">{plan === "premium" ? "Premium" : "Básico"}</strong>
            {email ? (
              <>
                <br />
                Email: {email}
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/dashboard/signals">Ir para o Dashboard</Link>
            </Button>
            <ManageSubscriptionButton />
          </div>
          <p className="text-xs text-muted-foreground">
            O portal Stripe abre numa nova página para alterar método de pagamento ou cancelar.
          </p>
        </>
      )}
    </div>
  );
}
