"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export function EmailCapture() {
  const { locale } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success(locale === "pt" ? "Obrigado — verifique o email." : "Thanks — check your inbox.");
      setEmail("");
    } catch {
      toast.error(locale === "pt" ? "Erro ao subscrever." : "Subscription failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Input
        type="email"
        required
        placeholder={locale === "pt" ? "O seu email" : "Your email"}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-xl"
        autoComplete="email"
      />
      <Button type="submit" disabled={loading} className="rounded-xl">
        {locale === "pt" ? "Receber novidades" : "Get updates"}
      </Button>
    </form>
  );
}
