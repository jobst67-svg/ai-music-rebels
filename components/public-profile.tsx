"use client";

import { useState } from "react";
import { ArtistTrack, TrackShelf } from "@/components/track-shelf";
import { ChannelVideo, VideoShelf } from "@/components/video-shelf";

type PublicProfile = {
  artist_name: string | null;
  slug: string;
  tagline: string | null;
  bio: string | null;
  image_path: string | null;
  banner_path: string | null;
  accent_color: string | null;
  channel_mode: "full" | "basic";
};

export function PublicProfile({ profile, name, links, tracks, videos, showViewSwitch = false, initialView }: {
  profile: PublicProfile;
  name: string;
  links: [string, string][];
  tracks: ArtistTrack[];
  videos: ChannelVideo[];
  showViewSwitch?: boolean;
  initialView?: "free" | "premium";
}) {
  const hasPremiumProfile = profile.channel_mode === "full";
  const [view, setView] = useState<"free" | "premium">(initialView ?? (hasPremiumProfile ? "premium" : "free"));
  const visibleTracks = view === "premium" ? tracks : tracks.slice(0, 5);
  const visibleVideos = view === "premium" ? videos : [];

  return <>
    {showViewSwitch ? <>
      <div className="profile-view-switch" role="group" aria-label="Profilansicht">
        <button type="button" className={view === "free" ? "active" : ""} onClick={() => setView("free")}>Freeprofil</button>
        <button type="button" className={view === "premium" ? "active" : ""} onClick={() => setView("premium")}>Premiumprofil</button>
      </div>
      {view === "free" ? <p className="profile-view-note">Nur der kostenlose Profil-Ausschnitt wird angezeigt.</p> : hasPremiumProfile ? <p className="profile-view-note">Vollständiges Premiumprofil</p> : <p className="profile-view-note">Das Premiumprofil ist für diesen Kanal noch nicht freigeschaltet.</p>}
    </> : <p className="profile-view-note">{hasPremiumProfile ? "Premiumprofil" : "Freeprofil"}</p>}
    <div className="channel-content"><p className="bio">{profile.bio || "Dieses Profil wird gerade aufgebaut."}</p>{links.length > 0 && <div className="links">{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer">{label} ↗</a>)}</div>}{hasPremiumProfile && <>{Object.entries(visibleTracks.reduce<Record<string, ArtistTrack[]>>((groups, track) => { const key = track.platform.trim() || "Weitere Plattformen"; (groups[key] ||= []).push(track); return groups; }, {})).map(([platform, platformTracks]) => <TrackShelf key={platform} tracks={platformTracks} sectionLabel={platform} showPlayer={view === "premium" && ["spotify", "soundcloud", "bandcamp"].includes(platform.toLowerCase())} />)}<VideoShelf videos={visibleVideos} /></>}</div>
  </>;
}
