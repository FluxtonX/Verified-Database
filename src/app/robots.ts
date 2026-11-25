import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/supabase/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/startup/", "/auth/", "/api/", "/login"] },
    sitemap: `${appOrigin()}/sitemap.xml`,
  };
}
