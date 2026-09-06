import { ArtistTrack } from "@/components/track-shelf";
import { ChannelVideo } from "@/components/video-shelf";
import { PublicProfile } from "@/components/public-profile";
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

  const showPremiumContent = profile.channel_mode === "full" && !profile.is_demo;
  const [videos, tracks] = showPremiumContent ? await Promise.all([
    query<ChannelVideo>("artist_videos", { artist_profile_id: `eq.${profile.id}`, select: "id,youtube_id,youtube_url,title", order: "created_at.desc" }),
    query<ArtistTrack>("artist_tracks", { artist_profile_id: `eq.${profile.id}`, select: "id,platform,title,track_url,cover_path", order: "created_at.desc", limit: "12" })
  ]) : [[], []];
  const name = profile.artist_name || profile.slug;
  const links = [["Spotify", profile.spotify_url], ["YouTube", profile.youtube_url], ["Suno", profile.suno_url], ["TikTok", profile.tiktok_url], ["Facebook", profile.facebook_url]].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const structuredData = { "@context": "https://schema.org", "@type": "Person", name, description: profile.bio || profile.tagline || undefined, url: `https://${profile.slug}.aimusicrebels.com`, image: profile.image_path || undefined, sameAs: links.map(([, url]) => url), jobTitle: "Independent AI music artist" };
  return <main className="shell page channel-page">
    <style>{`@media (max-width:760px){.channel-banner{height:auto!important;min-height:0!important;overflow:hidden!important;background:#000}.channel-banner img{display:block!important;width:100%!important;height:auto!important;max-height:none!important;object-fit:contain!important;object-position:center center!important}}`}</style>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <ProfileNav />
    <article className="channel">
      <div className="channel-banner" style={{ background: profile.banner_path ? undefined : `linear-gradient(120deg, ${profile.accent_color || "#d9ff3f"}, #151a11 45%, #101116)` }}>{profile.banner_path && <img src={profile.banner_path} alt={`${name} Kanalbanner`} />}</div>
      <header className="channel-head"><div className="channel-avatar" style={{ background: `linear-gradient(135deg, ${profile.accent_color || "#d9ff3f"}, #30372c)` }}>{profile.image_path ? <img src={profile.image_path} alt={name} /> : name.slice(0, 1)}</div><div><div className="eyebrow">AI Music Rebel</div><h1>{name}</h1><p className="tagline">{profile.tagline || "Independent AI music artist"}</p>{(profile.genre_primary || profile.genre_secondary) && <div className="genre-tags">{[profile.genre_primary, profile.genre_secondary].filter(Boolean).map((genre) => <span className="genre-pill" key={genre}>{genre}</span>)}</div>}</div></header>
      <PublicProfile profile={profile} name={name} links={links} tracks={tracks} videos={videos} showViewSwitch={false} />
    </article>
  </main>;
}
