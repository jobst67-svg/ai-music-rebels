"use client";

import { useState } from "react";

export type ChannelVideo = {
  id: number;
  youtube_id: string;
  youtube_url: string;
  title: string | null;
};

export function VideoShelf({ videos, editable = false, onDelete }: { videos: ChannelVideo[]; editable?: boolean; onDelete?: (id: number) => void }) {
  const [activeId, setActiveId] = useState<number | null>(videos[0]?.id ?? null);
  const active = videos.find((video) => video.id === activeId) ?? videos[0];

  if (videos.length === 0) return null;

  return (
    <section className="video-shelf">
      <div className="section-title"><div><div className="eyebrow">Videos</div><h2>Neueste Videos</h2></div><span>max. 5</span></div>
      {active && <div className="video-player"><iframe src={`https://www.youtube-nocookie.com/embed/${active.youtube_id}?rel=0`} title={active.title || "YouTube video"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
      <div className="video-grid">
        {videos.map((video) => <article className="video-card" key={video.id}>
          <button type="button" className={video.id === active?.id ? "video-thumb selected" : "video-thumb"} onClick={() => setActiveId(video.id)}>
            <img src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`} alt={video.title || "YouTube-Video"} />
            <span className="playmark">▶</span>
          </button>
          <p>{video.title || "YouTube-Video"}</p>
          {editable && <button type="button" className="removevideo" onClick={() => onDelete?.(video.id)}>Entfernen</button>}
        </article>)}
      </div>
    </section>
  );
}
