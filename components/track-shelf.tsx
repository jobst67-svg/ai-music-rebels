"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

export function TrackShelf({ tracks, editable = false, onDelete, onEdit, showPlayer = true, sectionLabel = "Songs", playerKey, activePlayerKey, onPlayerActivate }: { tracks: ArtistTrack[]; editable?: boolean; onDelete?: (id: number) => void; onEdit?: (track: ArtistTrack) => void; showPlayer?: boolean; sectionLabel?: string; playerKey?: string; activePlayerKey?: string | null; onPlayerActivate?: (playerKey: string) => void }) {
  const embeddedTracks = useMemo(() => tracks.map(embedForTrack).filter((track): track is EmbeddedTrack => Boolean(track)), [tracks]);
  const [activeId, setActiveId] = useState<number | null>(embeddedTracks[0]?.id ?? null);
  const [spotifyCovers, setSpotifyCovers] = useState<Record<number, string>>({});
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const scrollRail = (direction: number) => rail.current?.scrollBy({ left: rail.current.clientWidth * 0.82 * direction, behavior: "smooth" });
  const activeTrack = embeddedTracks.find((track) => track.id === activeId) ?? embeddedTracks[0];
  const playerIsActive = !playerKey || activePlayerKey === playerKey;
  const activatePlayer = (autoplay = false) => { if (autoplay) setShouldAutoplay(true); if (playerKey) onPlayerActivate?.(playerKey); };
  const playerSrc = activeTrack && shouldAutoplay ? activeTrack.kind === "soundcloud" ? activeTrack.embedUrl.replace("auto_play=false", "auto_play=true") : `${activeTrack.embedUrl}${activeTrack.embedUrl.includes("?") ? "&" : "?"}autoplay=1` : activeTrack?.embedUrl;
  const activeCover = activeTrack?.cover_path || spotifyCovers[activeTrack?.id ?? -1];
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
    <div className="section-title"><div><div className="eyebrow">{sectionLabel}</div><h2>Ausgewählte Titel</h2></div><div className="shelf-controls"><span>{tracks.length}</span><button type="button" aria-label="Titel nach links" onClick={() => scrollRail(-1)}>‹</button><button type="button" aria-label="Titel nach rechts" onClick={() => scrollRail(1)}>›</button></div></div>
    {showPlayer && activeTrack && <div className={`music-player ${activeTrack.kind} ${playerIsActive ? "" : "player-placeholder"}`}>
      {playerIsActive ? <iframe src={playerSrc} title={`${activeTrack.title} ${activeTrack.platform} player`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" /> : <button type="button" className="preview-placeholder" onClick={() => activatePlayer(true)} aria-label={`${activeTrack.title} Player aktivieren`}>
        {activeCover ? <img src={activeCover} alt="" /> : <span className="preview-placeholder-letter">{activeTrack.title.slice(0, 1)}</span>}
        <span className="preview-placeholder-overlay">▶ Vorschau öffnen</span>
      </button>}
    </div>}
    <div className="shelf-rail">
      <button type="button" className="shelf-arrow left" aria-label="Titel nach links" onClick={() => scrollRail(-1)}>‹</button>
      <div className="track-grid" ref={rail}>
      {tracks.map((track) => {
        const embedded = embedForTrack(track);
        const canPlay = showPlayer && Boolean(embedded);
        const cardActionIsEdit = editable && Boolean(onEdit);
        return <article className="track-card" key={track.id}>
        {cardActionIsEdit || canPlay ? <button type="button" onClick={() => {
          if (cardActionIsEdit) {
            onEdit?.(track);
            return;
          }
          setActiveId(track.id);
          activatePlayer(true);
        }} className={`track-cover ${activeTrack?.id === track.id ? "selected" : ""}`} aria-label={cardActionIsEdit ? `${track.title} bearbeiten` : `${track.title} abspielen`}>
          {track.cover_path || spotifyCovers[track.id] ? <img src={track.cover_path || spotifyCovers[track.id]} alt={track.title + " Cover"} /> : <span>{track.title.slice(0, 1)}</span>}
          <i>{cardActionIsEdit ? "✎" : "▶"}</i>
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
      <button type="button" className="shelf-arrow right" aria-label="Titel nach rechts" onClick={() => scrollRail(1)}>›</button>
    </div>
  </section>;
}
