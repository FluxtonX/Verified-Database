import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";

// Data loads on the server; the only direct browser connection is the inbox's Realtime socket.
// Sign-in, checkout and billing are full-page navigations. Forms may still post (or redirect)
// to those hosts when JavaScript is unavailable, so they're allowed as form targets.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Logos and avatars come from Supabase Storage, the App Store CDN and sponsors' HTTPS URLs.
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  // The inbox subscribes to Supabase Realtime for new messages.
  `connect-src 'self' ${supabase} ${supabase.replace(/^https:/, "wss:")}${dev ? " ws: wss:" : ""}`,
  `form-action 'self' ${supabase} https://accounts.google.com https://checkout.stripe.com https://billing.stripe.com`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      ],
    }];
  },
};

export default nextConfig;
