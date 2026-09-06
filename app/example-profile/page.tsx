import type { Metadata } from "next";
import { ArtistTrack } from "@/components/track-shelf";
import { ChannelVideo, VideoShelf } from "@/components/video-shelf";
import { TrackShelf } from "@/components/track-shelf";
import { ProfileNav } from "@/components/profile-nav";
import { ProfileViewSwitch } from "@/components/profile-view-switch";
import { SpotifyProfilePlayer } from "@/components/spotify-profile-player";
import { supabaseKey, supabaseUrl } from "@/lib/supabase";
import styles from "../artist/[slug]/voitto-profile.module.css";

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
  const spotifyTracks = tracks.filter((track) => track.platform.toLowerCase() === "spotify");
  const otherTracks = tracks.filter((track) => track.platform.toLowerCase() !== "spotify");
  const socialIcon = (label: string) => {
    const key = label.toLowerCase();
    const glyph = key === "spotify" ? "●" : key === "youtube" ? "▶" : key === "suno" ? "S" : key === "tiktok" ? "♪" : "f";
    const background = key === "spotify" ? "#1ed760" : key === "youtube" ? "#ff0033" : key === "suno" ? "#d9ff3f" : key === "tiktok" ? "#111" : "#1877f2";
    return <span className={styles.socialIcon} style={{ backgroundColor: background, color: key === "suno" ? "#101116" : "#fff" }}>{glyph}</span>;
  };

  return <main className={`shell page ${styles.page}`}>
    <ProfileNav />
    <article className={styles.frame} data-profile-frame data-profile-view="premium">
      <div className={styles.hero} style={{ background: profile.banner_path ? undefined : `linear-gradient(120deg,${profile.accent_color || "#bd0a2e"},#111 62%)` }}>{profile.banner_path && <img src={profile.banner_path} alt={`${name} Banner`} />}</div>
      <header className={styles.identity}>
        <div className={styles.avatar}>{profile.image_path ? <img src={profile.image_path} alt={name} /> : name.slice(0, 1)}</div>
        <div className={styles.titleBlock}><div className={styles.kicker}>AI Music Rebel · Beispielprofil</div><h1 className={styles.name}>{name}</h1><p className={styles.tagline}>{profile.tagline || "Independent AI music artist"}</p><div className={styles.genres}>{[profile.genre_primary, profile.genre_secondary].filter(Boolean).map((genre) => <span key={genre}>{genre}</span>)}</div></div>
      </header>
      <div className={styles.body}>
        <nav className={styles.sideNav}><a href="#profile">Profile</a><a href="#tracks">Selected Tracks</a><a href="#suno">Suno</a><a href="#spotify">Spotify</a></nav>
        <div className={styles.main}>
          <section className={styles.section} id="profile"><h2>About</h2><p className={styles.bio}>{profile.bio || "Dieses Profil wird gerade aufgebaut."}</p><p className={styles.quote}>Independent sound. Real ideas. No permission needed.</p></section>
          {videos.length > 0 && <section className={styles.section} id="videos" data-premium-content><VideoShelf videos={videos} showPlayer /></section>}
          {spotifyTracks.length > 0 && <section className={styles.section} id="tracks"><div id="spotify"><SpotifyProfilePlayer spotifyUrl={profile.spotify_url} name={name} /><TrackShelf tracks={spotifyTracks} sectionLabel="Selected Tracks" heading="Selected Tracks" showPlayer={false} /></div></section>}
          {otherTracks.length > 0 && <section className={styles.section} id="suno" data-premium-content><TrackShelf tracks={otherTracks} sectionLabel="Suno" heading="Suno" showPlayer={false} /></section>}
        </div>
        <aside className={styles.right}>
          <div className={styles.panel}><p className={styles.panelTitle}>Profile</p><ProfileViewSwitch /></div>
          <div className={styles.panel} id="links"><p className={styles.panelTitle}>Listen &amp; follow</p><div className={styles.socialIcons}>{links.map(([label, url]) => <a href={url} key={label} target="_blank" rel="noreferrer" aria-label={label}>{socialIcon(label)}</a>)}</div></div>
          <div className={styles.stats}><div><strong>{links.length}</strong><span>Links</span></div><div><strong>{tracks.length}</strong><span>Tracks</span></div><div><strong>{videos.length}</strong><span>Videos</span></div></div>
          <div className={styles.panel}><p className={styles.motto}>“{profile.tagline || "Independent AI music artist"}”</p></div>
        </aside>
      </div>
    </article>
  </main>;
}
