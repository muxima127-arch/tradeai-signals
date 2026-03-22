import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TradeAI Signals — Sinais IA para Day Trading",
    template: "%s · TradeAI Signals",
  },
  description:
    "Gerador de sinais com IA (ensemble GB+LSTM) para Brent, ouro, US500 e Forex CFDs. Risk score, backtest e alertas em tempo real.",
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
    title: "TradeAI Signals — Sinais IA para Day Trading",
    description:
      "Precisão simulada 78%, ensemble Gradient Boosting + LSTM, dashboard em tempo real.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeAI Signals",
    description: "Sinais IA para day traders — Brent, ouro, US500, Forex CFDs.",
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
      </body>
    </html>
  );
}
