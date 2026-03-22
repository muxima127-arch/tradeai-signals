import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.next();
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isAuthPage = path === "/login" || path === "/signup";
  const isTrialPage = path.startsWith("/dashboard/trial");
  const isVerifyPage = path === "/verify-email";
  const isSuccessPage = path === "/success";

  if (isDashboard && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPage && user) {
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL("/verify-email", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard/signals", request.url));
  }

  if (user && !user.email_confirmed_at) {
    const allow =
      isVerifyPage ||
      isSuccessPage ||
      path.startsWith("/api/") ||
      path.startsWith("/auth/callback") ||
      path === "/login" ||
      path === "/signup";
    if (!allow) {
      const r = request.nextUrl.clone();
      r.pathname = "/verify-email";
      r.search = "";
      return NextResponse.redirect(r);
    }
  }

  if (user && isDashboard && !isTrialPage && !isVerifyPage && !isSuccessPage) {
    const { data: subRows } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .limit(1);

    const hasPaidSub = (subRows?.length ?? 0) > 0;

    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();

    // trialOk: allow if trial_ends_at is null (new user) OR not yet expired
    const trialOk =
      profile?.trial_ends_at == null ||
      new Date(profile.trial_ends_at).getTime() > Date.now();

    if (!hasPaidSub && !trialOk) {
      const r = request.nextUrl.clone();
      r.pathname = "/pricing";
      r.searchParams.set("upgrade", "true");
      return NextResponse.redirect(r);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
