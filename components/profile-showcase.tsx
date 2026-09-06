"use client";

import { ArtistTrack, TrackShelf } from "@/components/track-shelf";
import { ChannelVideo, VideoShelf } from "@/components/video-shelf";
import { ProfileViewSwitch } from "@/components/profile-view-switch";
import { SpotifyProfilePlayer } from "@/components/spotify-profile-player";
import styles from "@/app/artist/[slug]/voitto-profile.module.css";

export type ShowcaseProfile = {
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

function socialIcon(label: string) {
  const key = label.toLowerCase();
  const glyph = key === "spotify" ? "●" : key === "youtube" ? "▶" : key === "suno" ? "S" : key === "tiktok" ? "♪" : "f";
  const background = key === "spotify" ? "#1ed760" : key === "youtube" ? "#ff0033" : key === "suno" ? "#d9ff3f" : key === "tiktok" ? "#111" : "#1877f2";
  return <span className={styles.socialIcon} style={{ backgroundColor: background, color: key === "suno" ? "#101116" : "#fff" }}>{glyph}</span>;
}

export function ProfileShowcase({
  profile,
  name,
  links,
  tracks,
  videos,
  initialView,
  premiumAvailable = profile.channel_mode === "full",
  kicker = "AI Music Rebel",
}: {
  profile: ShowcaseProfile;
  name: string;
  links: [string, string][];
  tracks: ArtistTrack[];
  videos: ChannelVideo[];
  initialView: "free" | "premium";
  premiumAvailable?: boolean;
  kicker?: string;
}) {
  const spotifyTracks = tracks.filter((track) => track.platform.toLowerCase() === "spotify");
  const otherTracks = tracks.filter((track) => track.platform.toLowerCase() !== "spotify");
  const profileView = premiumAvailable ? initialView : "free";

  return <article className={styles.frame} data-profile-frame data-profile-view={profileView}>
    <div className={styles.hero} style={{ background: profile.banner_path ? undefined : `linear-gradient(120deg,${profile.accent_color || "#bd0a2e"},#111 62%)` }}>
      {profile.banner_path && <img src={profile.banner_path} alt={`${name} Banner`} />}
    </div>
    <header className={styles.identity}>
      <div className={styles.avatar}>{profile.image_path ? <img src={profile.image_path} alt={name} /> : name.slice(0, 1)}</div>
      <div className={styles.titleBlock}>
        <div className={styles.kicker}>{kicker}</div>
        <h1 className={styles.name}>{name}</h1>
        <p className={styles.tagline}>{profile.tagline || "Independent AI music artist"}</p>
        <div className={styles.genres}>{[profile.genre_primary, profile.genre_secondary].filter(Boolean).map((genre) => <span key={genre}>{genre}</span>)}</div>
      </div>
    </header>
    <div className={styles.body}>
      <nav className={styles.sideNav} aria-label="Profilbereiche">
        <a href="#profile">Profile</a>
        <a href="#tracks">Selected Tracks</a>
        <a href="#suno">Suno</a>
        <a href="#spotify">Spotify</a>
      </nav>
      <div className={styles.main}>
        <section className={styles.section} id="profile">
          <h2>About</h2>
          <p className={styles.bio}>{profile.bio || "Dieses Profil wird gerade aufgebaut."}</p>
          <p className={styles.quote}>Independent sound. Real ideas. No permission needed.</p>
        </section>
        {videos.length > 0 && <section className={styles.section} id="videos" data-premium-content>
          <VideoShelf videos={videos} showPlayer />
        </section>}
        {(spotifyTracks.length > 0 || profile.spotify_url) && <section className={styles.section} id="tracks">
          <div id="spotify">
            <SpotifyProfilePlayer spotifyUrl={profile.spotify_url} name={name} />
            {spotifyTracks.length > 0 && <TrackShelf tracks={spotifyTracks} sectionLabel="Selected Tracks" heading="Selected Tracks" showPlayer={false} />}
          </div>
        </section>}
        {otherTracks.length > 0 && <section className={styles.section} id="suno" data-premium-content>
          <TrackShelf tracks={otherTracks} sectionLabel="More music" heading="Selected tracks" showPlayer={false} />
        </section>}
      </div>
      <aside className={styles.right}>
        <div className={styles.panel}>
          <p className={styles.panelTitle}>Profile</p>
          <ProfileViewSwitch initialView={profileView} premiumAvailable={premiumAvailable} />
        </div>
        <div className={styles.panel} id="links">
          <p className={styles.panelTitle}>Listen &amp; follow</p>
          <div className={styles.socialIcons}>{links.map(([label, url]) => <a href={url} key={label} target="_blank" rel="noreferrer" aria-label={label}>{socialIcon(label)}</a>)}</div>
        </div>
        <div className={styles.stats}>
          <div><strong>{links.length}</strong><span>Links</span></div>
          <div><strong>{tracks.length}</strong><span>Tracks</span></div>
          <div><strong>{videos.length}</strong><span>Videos</span></div>
        </div>
        <div className={styles.panel}><p className={styles.motto}>“{profile.tagline || "Independent AI music artist"}”</p></div>
      </aside>
    </div>
  </article>;
}
