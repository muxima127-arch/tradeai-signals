import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Entrar",
};

function FormFallback() {
  return <Skeleton className="h-48 w-full rounded-xl" />;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="mb-8 text-sm text-muted-foreground hover:text-foreground">
        ← TradeAI Signals
      </Link>
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Email, password ou Google</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormFallback />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
