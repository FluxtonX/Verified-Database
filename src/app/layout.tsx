import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VerifedDB - Buy and Sell SaaS Startups",
  icons: { icon: "/icon.svg" },
  description: "The database of verified startup revenues. Browse SaaS, mobile apps, and digital businesses with verified revenue on VerifedDB.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
