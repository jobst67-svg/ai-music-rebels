"use client";

export type ArtistTrack = {
  id: number;
  platform: string;
  title: string;
  track_url: string;
  cover_path: string | null;
};

export function TrackShelf({ tracks, editable = false, onDelete }: { tracks: ArtistTrack[]; editable?: boolean; onDelete?: (id: number) => void }) {
  if (tracks.length === 0) return null;
  return <section className="track-shelf">
    <div className="section-title"><div><div className="eyebrow">Songs</div><h2>Ausgewählte Titel</h2></div><span>{tracks.length}</span></div>
    <div className="track-grid">
      {tracks.map((track) => <article className="track-card" key={track.id}>
        <a href={track.track_url} target="_blank" rel="noreferrer" className="track-cover">
          {track.cover_path ? <img src={track.cover_path} alt={track.title + " Cover"} /> : <span>{track.title.slice(0, 1)}</span>}
          <i>↗</i>
        </a>
        <a href={track.track_url} target="_blank" rel="noreferrer" className="track-title">{track.title}</a>
        <p>{track.platform}</p>
        {editable && <button type="button" className="removevideo" onClick={() => onDelete?.(track.id)}>Entfernen</button>}
      </article>)}
    </div>
  </section>;
}
