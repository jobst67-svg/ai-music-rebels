import { ArtistTrack } from "@/components/track-shelf";
import { ChannelVideo } from "@/components/video-shelf";
import { ProfileShowcase } from "@/components/profile-showcase";
import { ProfileNav } from "@/components/profile-nav";
import { supabaseKey, supabaseUrl } from "@/lib/supabase";
import type { Metadata } from "next";

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
  is_demo?: boolean;
};

async function query<T>(table: string, params: Record<string, string>): Promise<T[]> {
  if (!supabaseKey) return [];
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${new URLSearchParams(params)}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    next: { revalidate: 30 }
  });
  return response.ok ? response.json() as Promise<T[]> : [];
}

async function findArtist(slug: string) {
  const rows = await query<ArtistProfile>("artist_profiles", { slug: `eq.${slug}`, is_published: "eq.true", select: "id,artist_name,slug,tagline,genre_primary,genre_secondary,bio,image_path,banner_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url,channel_mode" });
  if (rows[0]) return rows[0];
  const demos = await query<Omit<ArtistProfile, "channel_mode">>("demo_artist_profiles", { slug: `eq.${slug}`, is_published: "eq.true", select: "id,artist_name,slug,tagline,genre_primary,genre_secondary,bio,image_path,banner_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url" });
  return demos[0] ? { ...demos[0], channel_mode: "basic" as const, is_demo: true } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await findArtist(slug);
  if (!profile) return { title: "Profil nicht gefunden | AI Music Rebels", robots: { index: false, follow: false } };
  const name = profile.artist_name || profile.slug;
  const description = profile.tagline || profile.bio || `Künstlerprofil von ${name} auf AI Music Rebels.`;
  const canonical = `https://${profile.slug}.aimusicrebels.com`;
  return {
    title: `${name} – AI-Musik Künstlerprofil | AI Music Rebels`,
    description,
    alternates: { canonical },
    openGraph: { title: `${name} – AI Music Rebels`, description, url: canonical, type: "profile", images: [{ url: `https://aimusicrebels.com/artist/${profile.slug}/opengraph-image`, width: 1200, height: 630, alt: `${name} Künstlerprofil` }] },
    twitter: { card: "summary_large_image", title: `${name} – AI Music Rebels`, description, images: [`https://aimusicrebels.com/artist/${profile.slug}/opengraph-image`] }
  };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await findArtist(slug);

  if (!profile) return <main className="shell page"><ProfileNav /><section className="profile"><div className="eyebrow">404</div><h1>Profil nicht gefunden.</h1><p className="lead">Diese Künstlerseite ist noch nicht veröffentlicht oder existiert nicht.</p></section></main>;

  const [videos, tracks] = await Promise.all([
    query<ChannelVideo>("artist_videos", { artist_profile_id: `eq.${profile.id}`, select: "id,youtube_id,youtube_url,title", order: "created_at.desc" }),
    query<ArtistTrack>("artist_tracks", { artist_profile_id: `eq.${profile.id}`, select: "id,platform,title,track_url,cover_path", order: "created_at.desc", limit: "12" })
  ]);
  const name = profile.artist_name || profile.slug;
  const links = [["Spotify", profile.spotify_url], ["YouTube", profile.youtube_url], ["Suno", profile.suno_url], ["TikTok", profile.tiktok_url], ["Facebook", profile.facebook_url]].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const structuredData = { "@context": "https://schema.org", "@type": "Person", name, description: profile.bio || profile.tagline || undefined, url: `https://${profile.slug}.aimusicrebels.com`, image: profile.image_path || undefined, sameAs: links.map(([, url]) => url), jobTitle: "Independent AI music artist" };

  return <main className={`shell page profile-showcase-page`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <ProfileNav />
    <ProfileShowcase
      profile={profile}
      name={name}
      links={links}
      tracks={tracks}
      videos={videos}
      initialView={profile.channel_mode === "full" && !profile.is_demo ? "premium" : "free"}
      premiumAvailable={profile.channel_mode === "full" && !profile.is_demo}
    />
  </main>;
}
