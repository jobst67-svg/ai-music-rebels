"use client";

import { useEffect, useMemo, useState } from "react";

export type ArtistTrack = {
  id: number;
  platform: string;
  title: string;
  track_url: string;
  cover_path: string | null;
};

type EmbeddedTrack = ArtistTrack & { embedUrl: string; kind: "spotify" | "soundcloud" | "bandcamp" };

function embedForTrack(track: ArtistTrack): EmbeddedTrack | null {
  try {
    const url = new URL(track.track_url);
    const platform = track.platform.toLowerCase();

    if (platform === "spotify" && (url.hostname === "open.spotify.com" || url.hostname === "www.open.spotify.com")) {
      const [kind, id] = url.pathname.split("/").filter(Boolean);
      if (["track", "album", "playlist", "episode", "show"].includes(kind) && /^[A-Za-z0-9]+$/.test(id ?? "")) {
        return { ...track, kind: "spotify", embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator` };
      }
    }

    if (platform === "soundcloud" && (url.hostname === "soundcloud.com" || url.hostname.endsWith(".soundcloud.com"))) {
      return { ...track, kind: "soundcloud", embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.toString())}&color=%23d9ff3f&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true` };
    }

    if (platform === "bandcamp" && url.hostname === "bandcamp.com" && /^\/EmbeddedPlayer\/(?:album|track)=\d+/i.test(url.pathname)) {
      return { ...track, kind: "bandcamp", embedUrl: url.toString() };
    }
  } catch {
    // An invalid external link simply stays a normal link card.
  }
  return null;
}

export function TrackShelf({ tracks, editable = false, onDelete, showPlayer = true, sectionLabel = "Songs" }: { tracks: ArtistTrack[]; editable?: boolean; onDelete?: (id: number) => void; showPlayer?: boolean; sectionLabel?: string }) {
  const embeddedTracks = useMemo(() => tracks.map(embedForTrack).filter((track): track is EmbeddedTrack => Boolean(track)), [tracks]);
  const [activeId, setActiveId] = useState<number | null>(embeddedTracks[0]?.id ?? null);
  const [spotifyCovers, setSpotifyCovers] = useState<Record<number, string>>({});
  const activeTrack = embeddedTracks.find((track) => track.id === activeId) ?? embeddedTracks[0];
  useEffect(() => {
    let cancelled = false;
    const missing = tracks.filter((track) => !track.cover_path && track.platform.toLowerCase() === "spotify");
    if (missing.length === 0) return;
    Promise.all(missing.map(async (track) => {
      try {
        const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(track.track_url)}`);
        if (!response.ok) return null;
        const data = await response.json() as { thumbnail_url?: string };
        return data.thumbnail_url ? [track.id, data.thumbnail_url] as const : null;
      } catch { return null; }
    })).then((results) => {
      if (cancelled) return;
      const next: Record<number, string> = {};
      results.forEach((result) => { if (result) next[result[0]] = result[1]; });
      if (Object.keys(next).length > 0) setSpotifyCovers((current) => ({ ...current, ...next }));
    });
    return () => { cancelled = true; };
  }, [tracks]);
  if (tracks.length === 0) return null;

  return <section className="track-shelf">
    <div className="section-title"><div><div className="eyebrow">{sectionLabel}</div><h2>Ausgewählte Titel</h2></div><span>{tracks.length}</span></div>
    {showPlayer && activeTrack && <div className={`music-player ${activeTrack.kind}`}>
      <iframe src={activeTrack.embedUrl} title={`${activeTrack.title} ${activeTrack.platform} player`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
    </div>}
    <div className="track-grid">
      {tracks.map((track) => {
        const embedded = embedForTrack(track);
        const canPlay = showPlayer && Boolean(embedded);
        return <article className="track-card" key={track.id}>
        {canPlay ? <button type="button" onClick={() => setActiveId(track.id)} className={`track-cover ${activeTrack?.id === track.id ? "selected" : ""}`} aria-label={`${track.title} abspielen`}>
          {track.cover_path || spotifyCovers[track.id] ? <img src={track.cover_path || spotifyCovers[track.id]} alt={track.title + " Cover"} /> : <span>{track.title.slice(0, 1)}</span>}
          <i>▶</i>
        </button> : <a href={track.track_url} target="_blank" rel="noreferrer" className="track-cover">
          {track.cover_path || spotifyCovers[track.id] ? <img src={track.cover_path || spotifyCovers[track.id]} alt={track.title + " Cover"} /> : <span>{track.title.slice(0, 1)}</span>}
          <i>↗</i>
        </a>}
        <a href={track.track_url} target="_blank" rel="noreferrer" className="track-title">{track.title}</a>
        <p>{track.platform}</p>
        {editable && <button type="button" className="removevideo" onClick={() => onDelete?.(track.id)}>Entfernen</button>}
      </article>;
      })}
    </div>
  </section>;
}
