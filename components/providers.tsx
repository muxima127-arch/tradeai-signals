"use client";

import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <I18nProvider>
        <AnalyticsProvider>{children}</AnalyticsProvider>
        <Toaster richColors position="top-center" />
      </I18nProvider>
    </ThemeProvider>
  );
}
