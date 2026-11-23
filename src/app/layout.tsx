import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
import { siteFonts } from "./fonts";

export const metadata: Metadata = {
  title: "VerifedDB - Buy and Sell SaaS Startups",
  icons: { icon: "/icon.svg" },
  description: "The open market for indie startups. Founders list with revenue from Stripe or RevenueCat, and buyers talk to them directly.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" className={siteFonts}><body>{children}</body></html>;
}
