"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientSafe } from "@/lib/supabase/client";
import { toast } from "sonner";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClientSafe();
    if (!supabase) {
      toast.error("Configure NEXT_PUBLIC_SUPABASE_URL no .env");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { plan: plan ?? "trial" },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verifique o email para confirmar.");
    router.replace(plan ? `/dashboard/signals?checkout=${plan}` : "/dashboard/signals");
    router.refresh();
  }

  async function signInGoogle() {
    const supabase = createClientSafe();
    if (!supabase) {
      toast.error("Configure Supabase no .env");
      return;
    }
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="rounded-xl"
        />
      </div>
      <Button type="submit" className="w-full rounded-xl" disabled={loading}>
        Criar conta
      </Button>
      <Button type="button" variant="outline" className="w-full rounded-xl" onClick={signInGoogle}>
        Google
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
