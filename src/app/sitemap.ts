import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/supabase/config";
import { publicSupabase } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = appOrigin();
  const pages: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/acquire`, changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/advertise`, changeFrequency: "monthly", priority: 0.4 },
  ];
  // Only listings anonymous visitors can see (the same view guests browse).
  const supabase = publicSupabase();
  const { data } = supabase
    ? await supabase.from("marketplace").select("id,listed_at").order("listed_at", { ascending: false }).limit(5000)
    : { data: null };
  return [...pages, ...(data ?? []).map((listing: { id: string; listed_at: string | null }) => ({
    url: `${origin}/acquire/${listing.id}`,
    lastModified: listing.listed_at ?? undefined,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))];
}
