import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Preços",
};

export default function PricingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold">Preços</h1>
      <p className="text-muted-foreground">
        O checkout foi cancelado ou está a rever planos. Veja os detalhes na página principal.
      </p>
      <Button asChild>
        <Link href="/#pricing">Voltar aos planos</Link>
      </Button>
    </div>
  );
}
