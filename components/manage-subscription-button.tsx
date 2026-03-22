"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ManageSubscriptionButton({
  variant = "outline",
  className,
}: {
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
      } else {
        toast.error(json.error ?? "Portal indisponível");
      }
    } catch {
      toast.error("Erro ao abrir portal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={loading}
      onClick={() => void openPortal()}
    >
      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      Gerir subscrição
    </Button>
  );
}
