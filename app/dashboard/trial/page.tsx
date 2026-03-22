import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Trial",
};

export default function TrialPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <h1 className="text-2xl font-semibold">Período de trial</h1>
      <p className="text-muted-foreground">
        Estás no plano gratuito com trial de 7 dias. Explora os sinais e o dashboard. Quando quiseres
        mais funcionalidades, faz upgrade.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard/signals">Ver sinais</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/#pricing">Ver planos</Link>
        </Button>
      </div>
    </div>
  );
}
