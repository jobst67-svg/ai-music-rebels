"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./music-browser.module.css";

export type DiscoverTrack = {
  id: number;
  platform: string;
  title: string;
  track_url: string;
  cover_path: string | null;
  artist_name: string;
  artist_slug: string;
  genre_primary: string | null;
  genre_secondary: string | null;
};

type Playlist = { id: string; name: string; trackIds: number[] };

function spotifyEmbed(track: DiscoverTrack) {
  try {
    const url = new URL(track.track_url);
    if (track.platform.toLowerCase() !== "spotify" || !url.hostname.includes("spotify.com")) return null;
    const [kind, id] = url.pathname.split("/").filter(Boolean);
    if (!["track", "album", "playlist", "episode", "show"].includes(kind) || !id) return null;
    return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator`;
  } catch {
    return null;
  }
}

export function MusicBrowser({ tracks }: { tracks: DiscoverTrack[] }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("Alle");
  const [selectedId, setSelectedId] = useState<number | null>(tracks[0]?.id ?? null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>("");
  const [newPlaylistName, setNewPlaylistName] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("amr-anonymous-playlists");
      const parsed = saved ? JSON.parse(saved) as Playlist[] : [];
      if (parsed.length) {
        setPlaylists(parsed);
        setActivePlaylistId(parsed[0].id);
      } else {
        const first = { id: crypto.randomUUID(), name: "Meine Playlist", trackIds: [] };
        setPlaylists([first]);
        setActivePlaylistId(first.id);
      }
    } catch {
      const first = { id: String(Date.now()), name: "Meine Playlist", trackIds: [] };
      setPlaylists([first]);
      setActivePlaylistId(first.id);
    }
  }, []);

  useEffect(() => {
    if (playlists.length) localStorage.setItem("amr-anonymous-playlists", JSON.stringify(playlists));
  }, [playlists]);

  const genres = useMemo(() => {
    const values = new Set<string>();
    tracks.forEach((track) => [track.genre_primary, track.genre_secondary].forEach((value) => value && values.add(value)));
    return ["Alle", ...Array.from(values).sort((a, b) => a.localeCompare(b, "de"))];
  }, [tracks]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tracks.filter((track) => {
      const genreMatch = genre === "Alle" || track.genre_primary === genre || track.genre_secondary === genre;
      const searchMatch = !needle || [track.title, track.artist_name, track.genre_primary, track.genre_secondary, track.platform]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
      return genreMatch && searchMatch;
    });
  }, [tracks, query, genre]);

  const selected = tracks.find((track) => track.id === selectedId) ?? filtered[0] ?? null;
  const embed = selected ? spotifyEmbed(selected) : null;
  const activePlaylist = playlists.find((playlist) => playlist.id === activePlaylistId) ?? playlists[0];
  const playlistTracks = activePlaylist ? activePlaylist.trackIds.map((id) => tracks.find((track) => track.id === id)).filter((track): track is DiscoverTrack => Boolean(track)) : [];

  function createPlaylist() {
    const name = newPlaylistName.trim();
    if (!name) return;
    const playlist = { id: crypto.randomUUID(), name, trackIds: [] };
    setPlaylists((current) => [...current, playlist]);
    setActivePlaylistId(playlist.id);
    setNewPlaylistName("");
  }

  function toggleTrack(trackId: number) {
    if (!activePlaylist) return;
    setPlaylists((current) => current.map((playlist) => playlist.id !== activePlaylist.id ? playlist : {
      ...playlist,
      trackIds: playlist.trackIds.includes(trackId) ? playlist.trackIds.filter((id) => id !== trackId) : [...playlist.trackIds, trackId]
    }));
  }

  return <section className={styles.wrap}>
    <div className={styles.hero}>
      <div className="eyebrow">MUSIK ENTDECKEN</div>
      <h1>Finden. Hören. Sammeln.</h1>
      <p>Ohne Registrierung nach Songs, Künstlern und Genres suchen. Playlists werden lokal auf diesem Gerät gespeichert.</p>
    </div>

    <div className={styles.controls}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Song, Künstler oder Genre suchen …" aria-label="Musik suchen" />
      <select value={genre} onChange={(event) => setGenre(event.target.value)} aria-label="Genre filtern">
        {genres.map((item) => <option value={item} key={item}>{item}</option>)}
      </select>
    </div>

    {selected && <div className={styles.playerCard}>
      <div className={styles.nowPlaying}>
        <div className={styles.cover}>{selected.cover_path ? <img src={selected.cover_path} alt="" /> : <span>{selected.title.slice(0, 1)}</span>}</div>
        <div><small>JETZT AUSGEWÄHLT</small><h2>{selected.title}</h2><Link href={`https://${selected.artist_slug}.aimusicrebels.com`}>{selected.artist_name}</Link><p>{[selected.genre_primary, selected.genre_secondary].filter(Boolean).join(" · ") || selected.platform}</p></div>
      </div>
      {embed ? <iframe src={embed} title={`${selected.title} Player`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" /> : <a className={styles.externalPlay} href={selected.track_url} target="_blank" rel="noreferrer">▶ Auf {selected.platform} hören</a>}
    </div>}

    <div className={styles.columns}>
      <div>
        <div className={styles.sectionHead}><h2>Ergebnisse</h2><span>{filtered.length}</span></div>
        <div className={styles.results}>
          {filtered.map((track) => {
            const inPlaylist = activePlaylist?.trackIds.includes(track.id) ?? false;
            return <article className={styles.track} key={track.id}>
              <button className={styles.trackMain} type="button" onClick={() => setSelectedId(track.id)}>
                <span className={styles.trackCover}>{track.cover_path ? <img src={track.cover_path} alt="" /> : track.title.slice(0,1)}</span>
                <span><strong>{track.title}</strong><small>{track.artist_name} · {[track.genre_primary, track.genre_secondary].filter(Boolean).join(" · ") || track.platform}</small></span>
              </button>
              <button type="button" className={styles.addButton} onClick={() => toggleTrack(track.id)} aria-label={inPlaylist ? "Aus Playlist entfernen" : "Zur Playlist hinzufügen"}>{inPlaylist ? "✓" : "+"}</button>
            </article>;
          })}
          {filtered.length === 0 && <p className={styles.empty}>Keine passenden Songs gefunden.</p>}
        </div>
      </div>

      <aside className={styles.playlistPanel}>
        <div className={styles.sectionHead}><h2>Meine Playlists</h2></div>
        <div className={styles.newPlaylist}><input value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)} placeholder="Neue Playlist" /><button type="button" onClick={createPlaylist}>+</button></div>
        <div className={styles.playlistTabs}>{playlists.map((playlist) => <button type="button" key={playlist.id} className={playlist.id === activePlaylistId ? styles.activeTab : ""} onClick={() => setActivePlaylistId(playlist.id)}>{playlist.name} <small>{playlist.trackIds.length}</small></button>)}</div>
        <div className={styles.playlistTracks}>
          {playlistTracks.map((track) => <button type="button" key={track.id} onClick={() => setSelectedId(track.id)}><strong>{track.title}</strong><small>{track.artist_name}</small></button>)}
          {playlistTracks.length === 0 && <p>Noch keine Songs in dieser Playlist.</p>}
        </div>
        <p className={styles.localNote}>Ohne Konto bleibt die Playlist nur in diesem Browser gespeichert.</p>
      </aside>
    </div>
  </section>;
}
