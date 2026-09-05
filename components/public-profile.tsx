"use client";

import { useMemo, useState } from "react";
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

function ServiceIcon({ label }: { label: string }) {
  const name = label.toLowerCase();
  if (name === "spotify") return <svg className="service-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1ed760" /><path d="M6.5 9.1c3.7-1 7.7-.7 10.9.9M7.5 12.6c2.9-.7 6-.5 8.6.7M8.4 15.8c2.1-.4 4.3-.2 6.2.5" fill="none" stroke="#101116" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  if (name === "youtube") return <svg className="service-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="#ff0033" /><path d="m10 8.5 6 3.5-6 3.5v-7Z" fill="white" /></svg>;
  if (name === "facebook") return <svg className="service-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1877f2" /><path d="M13.5 20v-7h2.4l.4-2.7h-2.8V8.6c0-.8.3-1.4 1.5-1.4h1.6V4.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v1.5H8v2.7h2.2v7h3.3Z" fill="white" /></svg>;
  if (name === "soundcloud") return <span className="service-letter soundcloud" aria-hidden="true">☁</span>;
  if (name === "bandcamp") return <span className="service-letter bandcamp" aria-hidden="true">b</span>;
  if (name === "tiktok") return <span className="service-letter tiktok" aria-hidden="true">♪</span>;
  if (name === "suno") return <span className="service-letter suno" aria-hidden="true">S</span>;
  return <span className="service-letter" aria-hidden="true">{label.slice(0, 1).toUpperCase()}</span>;
}

export function PublicProfile({ profile, name, links, tracks, videos, showViewSwitch = false, initialView, showPlayers = true }: {
  profile: PublicProfile;
  name: string;
  links: [string, string][];
  tracks: ArtistTrack[];
  videos: ChannelVideo[];
  showViewSwitch?: boolean;
  initialView?: "free" | "premium";
  showPlayers?: boolean;
}) {
  const hasPremiumProfile = profile.channel_mode === "full";
  const [view, setView] = useState<"free" | "premium">(initialView ?? (hasPremiumProfile ? "premium" : "free"));
  const visibleTracks = view === "premium" ? tracks : tracks.slice(0, 5);
  const visibleVideos = view === "premium" ? videos : [];
  const playersEnabled = showPlayers && view === "premium";
  const groupedTracks = useMemo(() => Object.entries(visibleTracks.reduce<Record<string, ArtistTrack[]>>((groups, track) => {
    const key = track.platform.trim() || "Weitere Plattformen";
    (groups[key] ||= []).push(track);
    return groups;
  }, {})), [visibleTracks]);
  const firstPlayerKey = groupedTracks.find(([platform]) => ["spotify", "soundcloud", "bandcamp"].includes(platform.toLowerCase()))?.[0];
  const activePlayerKey = firstPlayerKey ? `tracks-${firstPlayerKey.toLowerCase()}` : visibleVideos.length > 0 ? "videos" : null;
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string | null>(null);
  const currentPlayerKey = selectedPlayerKey ?? activePlayerKey;

  return <>
    {showViewSwitch ? <>
      <div className="profile-view-switch" role="group" aria-label="Profilansicht">
        <button type="button" className={view === "free" ? "active" : ""} onClick={() => setView("free")}>Freeprofil</button>
        <button type="button" className={view === "premium" ? "active" : ""} onClick={() => setView("premium")}>Premiumprofil</button>
      </div>
      {view === "free" ? <p className="profile-view-note">Nur der kostenlose Profil-Ausschnitt wird angezeigt.</p> : hasPremiumProfile ? <p className="profile-view-note">Vollständiges Premiumprofil</p> : <p className="profile-view-note">Das Premiumprofil ist für diesen Kanal noch nicht freigeschaltet.</p>}
    </> : <p className="profile-view-note">{hasPremiumProfile ? "Premiumprofil" : "Freeprofil"}</p>}
    <div className="channel-content">
      <p className="bio">{profile.bio || "Dieses Profil wird gerade aufgebaut."}</p>
      {links.length > 0 && <div className="links">{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer"><ServiceIcon label={label} /><span>{label}</span><span aria-hidden="true">↗</span></a>)}</div>}
      {hasPremiumProfile && <>
        {groupedTracks.map(([platform, platformTracks]) => <TrackShelf key={platform} tracks={platformTracks} sectionLabel={platform} showPlayer={playersEnabled && ["spotify", "soundcloud", "bandcamp"].includes(platform.toLowerCase())} playerKey={`tracks-${platform.toLowerCase()}`} activePlayerKey={currentPlayerKey} onPlayerActivate={setSelectedPlayerKey} />)}
        <VideoShelf videos={visibleVideos} showPlayer={playersEnabled} playerKey="videos" activePlayerKey={currentPlayerKey} onPlayerActivate={setSelectedPlayerKey} />
      </>}
    </div>
  </>;
}
