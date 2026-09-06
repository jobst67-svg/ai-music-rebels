function spotifyEmbedUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname !== "open.spotify.com" && url.hostname !== "www.open.spotify.com") return null;
    const [kind, id] = url.pathname.split("/").filter(Boolean);
    if (!["artist", "track", "album", "playlist", "episode", "show"].includes(kind ?? "") || !/^[A-Za-z0-9]+$/.test(id ?? "")) return null;
    return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator`;
  } catch {
    return null;
  }
}

export function SpotifyProfilePlayer({ spotifyUrl, name }: { spotifyUrl: string | null; name: string }) {
  const embedUrl = spotifyEmbedUrl(spotifyUrl);
  if (!embedUrl) return null;

  return <section className="showcase-spotify-player" aria-label="Spotify Player">
    <div className="section-title"><div><div className="eyebrow">Spotify</div><h2>Direkt anhören</h2></div></div>
    <div className="music-player spotify spotify-compact">
      <iframe src={embedUrl} title={`${name} Spotify Player`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
    </div>
  </section>;
}
