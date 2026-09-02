import type { MetadataRoute } from "next";
import { supabaseKey, supabaseUrl } from "@/lib/supabase";

type Row = { slug: string; updated_at: string | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://aimusicrebels.com";
  const urls: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/legal/agb`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal/datenschutz`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal/impressum`, changeFrequency: "yearly", priority: 0.2 }
  ];
  if (!supabaseKey) return urls;
  const response = await fetch(`${supabaseUrl}/rest/v1/artist_profiles?is_published=eq.true&select=slug,updated_at`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }, next: { revalidate: 3600 } });
  if (!response.ok) return urls;
  const profiles = await response.json() as Row[];
  return urls.concat(profiles.map((profile) => ({ url: `https://${profile.slug}.aimusicrebels.com`, lastModified: profile.updated_at ? new Date(profile.updated_at) : new Date(), changeFrequency: "weekly" as const, priority: 0.8 })));
}
