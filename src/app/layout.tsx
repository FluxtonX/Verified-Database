import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
import { siteFonts } from "./fonts";
import { appOrigin } from "@/lib/supabase/config";

const description = "The open market for indie startups. Founders list with revenue from Stripe or RevenueCat, and buyers talk to them directly.";

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin()),
  title: "VerifedDB - Buy and Sell SaaS Startups",
  icons: { icon: "/icon.svg" },
  description,
  openGraph: { type: "website", siteName: "VerifedDB", title: "VerifedDB - Buy and Sell SaaS Startups", description },
  twitter: { card: "summary", title: "VerifedDB - Buy and Sell SaaS Startups", description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" className={siteFonts}><body>{children}</body></html>;
}
