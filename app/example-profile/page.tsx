import type { Metadata } from "next";
import { ArtistTrack } from "@/components/track-shelf";
import { ChannelVideo } from "@/components/video-shelf";
import { ProfileShowcase } from "@/components/profile-showcase";
import { ProfileNav } from "@/components/profile-nav";
import { supabaseKey, supabaseUrl } from "@/lib/supabase";

type ArtistProfile = {
  id: string;
  artist_name: string | null;
  slug: string;
  tagline: string | null;
  genre_primary: string | null;
  genre_secondary: string | null;
  bio: string | null;
  image_path: string | null;
  banner_path: string | null;
  accent_color: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  suno_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  channel_mode: "full" | "basic";
};

async function query<T>(table: string, params: Record<string, string>): Promise<T[]> {
  if (!supabaseKey) return [];
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${new URLSearchParams(params)}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    next: { revalidate: 60 }
  });
  return response.ok ? response.json() as Promise<T[]> : [];
}

async function findVoitto() {
  const rows = await query<ArtistProfile>("artist_profiles", {
    slug: "eq.voitto-tai-kooma",
    is_published: "eq.true",
    select: "id,artist_name,slug,tagline,genre_primary,genre_secondary,bio,image_path,banner_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url,channel_mode"
  });
  return rows[0] ?? null;
}

export const metadata: Metadata = {
  title: "Beispielprofil – Voitto Tai Kooma | AI Music Rebels",
  description: "Beispiel eines Free- und Premium-Künstlerprofils auf AI Music Rebels."
};

export default async function ExampleProfilePage() {
  const profile = await findVoitto();

  if (!profile) {
    return <main className="shell page"><ProfileNav /><section className="profile"><div className="eyebrow">Beispielprofil</div><h1>Profil nicht verfügbar.</h1><p className="lead">Das Beispielprofil wird gerade vorbereitet.</p></section></main>;
  }

  const [videos, tracks] = await Promise.all([
    query<ChannelVideo>("artist_videos", { artist_profile_id: `eq.${profile.id}`, select: "id,youtube_id,youtube_url,title", order: "created_at.desc" }),
    query<ArtistTrack>("artist_tracks", { artist_profile_id: `eq.${profile.id}`, select: "id,platform,title,track_url,cover_path", order: "created_at.desc", limit: "12" })
  ]);
  const name = profile.artist_name || profile.slug;
  const links = [["Spotify", profile.spotify_url], ["YouTube", profile.youtube_url], ["Suno", profile.suno_url], ["TikTok", profile.tiktok_url], ["Facebook", profile.facebook_url]].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return <main className="shell page profile-showcase-page">
    <ProfileNav />
    <ProfileShowcase profile={profile} name={name} links={links} tracks={tracks} videos={videos} initialView="premium" premiumAvailable />
  </main>;
}
