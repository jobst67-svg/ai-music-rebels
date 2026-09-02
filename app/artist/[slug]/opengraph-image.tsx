import { ImageResponse } from "next/og";
import { supabaseKey, supabaseUrl } from "@/lib/supabase";

export const runtime = "edge";
export const alt = "Artist profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Profile = { artist_name: string | null; slug: string; tagline: string | null; image_path: string | null; accent_color: string | null };

async function findProfile(slug: string) {
  if (!supabaseKey) return null;
  const params = new URLSearchParams({ slug: `eq.${slug}`, is_published: "eq.true", select: "artist_name,slug,tagline,image_path,accent_color" });
  const response = await fetch(`${supabaseUrl}/rest/v1/artist_profiles?${params}`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }, cache: "no-store" });
  if (!response.ok) return null;
  const rows = await response.json() as Profile[];
  return rows[0] ?? null;
}

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await findProfile(slug);
  const name = profile?.artist_name || profile?.slug || slug;
  const accent = profile?.accent_color || "#d9ff3f";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "64px", background: "#101116", color: "#f6f4ef", fontFamily: "Arial" }}>
      <div style={{ width: 270, height: 270, borderRadius: 135, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 54, background: `linear-gradient(135deg, ${accent}, #30372c)`, color: "#101116", fontSize: 108, fontWeight: 900 }}>
        {profile?.image_path ? <img src={profile.image_path} width="270" height="270" style={{ objectFit: "cover" }} /> : name.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
        <div style={{ display: "flex", color: accent, fontSize: 24, fontWeight: 800, letterSpacing: 4 }}>AI MUSIC REBEL</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 70, lineHeight: 1, fontWeight: 900, letterSpacing: -3 }}>{name}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 27, color: "#c9cbd0" }}>{profile?.tagline || "Independent AI music artist"}</div>
        <div style={{ display: "flex", marginTop: 38, fontSize: 21, color: "#9da0a6" }}>aimusicrebels.com</div>
      </div>
    </div>,
    { ...size }
  );
}
