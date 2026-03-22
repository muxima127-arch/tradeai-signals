"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import Script from "next/script";
import { Suspense, useEffect } from "react";

const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

if (typeof window !== "undefined" && phKey) {
  posthog.init(phKey, {
    api_host: phHost,
    person_profiles: "identified_only",
    capture_pageview: false,
    loaded: () => {
      /* noop */
    },
  });
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!phKey) return;
    const url =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { $current_url: window.location.origin + url });
  }, [pathname, searchParams]);

  return null;
}

const gaId =
  process.env.NEXT_PUBLIC_GA4_ID ?? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const inner = (
    <>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );

  if (phKey) {
    return <PostHogProvider client={posthog}>{inner}</PostHogProvider>;
  }

  return inner;
}
