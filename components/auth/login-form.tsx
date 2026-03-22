"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientSafe } from "@/lib/supabase/client";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard/signals";
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.replace(redirect);
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
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>
      <Button type="submit" className="w-full rounded-xl" disabled={loading}>
        Entrar
      </Button>
      <Button type="button" variant="outline" className="w-full rounded-xl" onClick={signInGoogle}>
        Google
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Sem conta?{" "}
        <Link href="/signup" className="text-primary underline">
          Registar
        </Link>
      </p>
    </form>
  );
}
