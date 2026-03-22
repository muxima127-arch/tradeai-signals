import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Preços",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; checkout?: string }>;
}) {
  const sp = await searchParams;
  const upgrade = sp.upgrade === "true";
  const cancelled = sp.checkout === "cancel";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold">Preços</h1>
      {upgrade ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Precisas de uma subscrição ativa ou trial válido para aceder ao dashboard completo. Escolhe um
          plano abaixo na página principal.
        </p>
      ) : null}
      {cancelled ? (
        <p className="text-muted-foreground">Checkout cancelado. Podes tentar novamente quando quiseres.</p>
      ) : null}
      {!upgrade && !cancelled ? (
        <p className="text-muted-foreground">
          O checkout foi cancelado ou estás a rever planos. Vê os detalhes na página principal.
        </p>
      ) : null}
      <Button asChild>
        <Link href="/#pricing">Voltar aos planos</Link>
      </Button>
    </div>
  );
}
