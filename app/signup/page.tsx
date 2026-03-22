import { Suspense } from "react";
import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Registar",
};

function FormFallback() {
  return <Skeleton className="h-48 w-full rounded-xl" />;
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="mb-8 text-sm text-muted-foreground hover:text-foreground">
        ← TradeAI Signals
      </Link>
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Trial 7 dias nos planos pagos via Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormFallback />}>
            <SignupForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
