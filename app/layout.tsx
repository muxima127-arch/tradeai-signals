import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradeai-signals.vercel.app";
const ogTitle = "TradeAI Signals — Sinais IA para Day Trading";
const ogDescription =
  "Sinais de trading com IA (GB+LSTM), precisão 78%. Brent, Ouro, US500, Forex CFDs.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: ogTitle,
    template: "%s · TradeAI Signals",
  },
  description: ogDescription,
  applicationName: "TradeAI Signals",
  keywords: [
    "trading",
    "sinais",
    "IA",
    "Brent",
    "ouro",
    "US500",
    "forex",
    "CFD",
    "day trading",
  ],
  authors: [{ name: "TradeAI Signals" }],
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: siteUrl,
    siteName: "TradeAI Signals",
    title: ogTitle,
    description: ogDescription,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "TradeAI Signals" }],
  },
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description: ogDescription,
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TradeAI",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <Providers>
          {children}
          <PwaRegister />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
