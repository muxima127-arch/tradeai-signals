import { createClientSafe } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClientSafe();
  let email: string | null = null;
  let tier = "free";

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle();
      tier = profile?.subscription_tier ?? "free";
    }
  }

  return (
    <DashboardShell email={email} tier={tier}>
      {children}
    </DashboardShell>
  );
}
