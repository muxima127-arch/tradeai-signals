"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao reenviar");
        return;
      }
      toast.success("Email reenviado. Verifica a caixa de entrada.");
    } catch {
      toast.error("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Confirma o teu email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviámos um link para ativar a conta TradeAI Signals. Se não recebeste, reenvia abaixo.
        </p>
      </div>
      <form onSubmit={resend} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ve-email">Email</Label>
          <Input
            id="ve-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ve-pass">Password</Label>
          <Input
            id="ve-pass"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="rounded-xl"
          />
        </div>
        <Button type="submit" className="w-full rounded-xl" disabled={loading}>
          Reenviar email
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Já confirmaste?{" "}
        <Link href="/login" className="text-primary underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
