import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradeai-signals.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const root = base.replace(/\/$/, "");
  const last = new Date();
  const paths = [
    "",
    "/pricing",
    "/login",
    "/signup",
    "/privacy",
    "/terms",
    "/cookies",
  ];
  return paths.map((p) => ({
    url: `${root}${p}`,
    lastModified: last,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.6,
  }));
}
