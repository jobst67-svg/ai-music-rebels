"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import styles from "./music-browser.module.css";

export type DiscoverTrack = { id:number; platform:string; title:string; track_url:string; cover_path:string|null; artist_name:string; artist_slug:string; genre_primary:string|null; genre_secondary:string|null };
type Playlist = { id:string; name:string; trackIds:number[] };

function spotifyEmbed(track: DiscoverTrack, autoplay = false) {
  try {
    const url = new URL(track.track_url);
    if (track.platform.toLowerCase() !== "spotify" || !url.hostname.includes("spotify.com")) return null;
    const [kind, id] = url.pathname.split("/").filter(Boolean);
    if (!["track","album","playlist","episode","show"].includes(kind) || !id) return null;
    return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator${autoplay ? "&autoplay=1" : ""}`;
  } catch { return null; }
}

export function MusicBrowser({tracks}:{tracks:DiscoverTrack[]}) {
  const [query,setQuery]=useState("");
  const [genre,setGenre]=useState("Alle");
  const [selectedId,setSelectedId]=useState<number|null>(tracks[0]?.id??null);
  const [playlists,setPlaylists]=useState<Playlist[]>([]);
  const [activePlaylistId,setActivePlaylistId]=useState("");
  const [newPlaylistName,setNewPlaylistName]=useState("");
  const [userId,setUserId]=useState<string|null>(null);
  const [email,setEmail]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [autoplay,setAutoplay]=useState(false);

  useEffect(()=>{(async()=>{
    let uid:string|null=null;
    if(hasSupabaseConfig){const {data}=await getSupabase().auth.getUser();uid=data.user?.id??null;setUserId(uid);setEmail(data.user?.email??null);}
    if(uid){
      const sb=getSupabase();
      const {data:cloud}=await sb.from("listener_playlists").select("id,name,listener_playlist_tracks(track_id)").eq("user_id",uid).order("created_at");
      if(cloud?.length){
        const p=cloud.map((x:any)=>({id:x.id,name:x.name,trackIds:(x.listener_playlist_tracks??[]).map((t:any)=>Number(t.track_id))}));
        setPlaylists(p);setActivePlaylistId(p[0].id);localStorage.removeItem("amr-anonymous-playlists");setLoaded(true);return;
      }
      const saved=localStorage.getItem("amr-anonymous-playlists");
      const local=saved?JSON.parse(saved) as Playlist[]:[];
      if(local.length){
        const imported:Playlist[]=[];
        for(const p of local){
          const {data:created}=await sb.from("listener_playlists").insert({user_id:uid,name:p.name}).select("id,name").single();
          if(created){
            if(p.trackIds.length)await sb.from("listener_playlist_tracks").insert(p.trackIds.map(track_id=>({playlist_id:created.id,track_id})));
            imported.push({id:created.id,name:created.name,trackIds:p.trackIds});
          }
        }
        if(imported.length){setPlaylists(imported);setActivePlaylistId(imported[0].id);localStorage.removeItem("amr-anonymous-playlists");setLoaded(true);return;}
      }
    }
    try{
      const saved=localStorage.getItem("amr-anonymous-playlists");
      const parsed=saved?JSON.parse(saved) as Playlist[]:[];
      const p=parsed.length?parsed:[{id:crypto.randomUUID(),name:"Meine Playlist",trackIds:[]}];
      setPlaylists(p);setActivePlaylistId(p[0].id);
    }catch{
      const p=[{id:String(Date.now()),name:"Meine Playlist",trackIds:[]}];setPlaylists(p);setActivePlaylistId(p[0].id);
    }
    setLoaded(true);
  })();},[]);

  useEffect(()=>{if(loaded&&!userId&&playlists.length)localStorage.setItem("amr-anonymous-playlists",JSON.stringify(playlists));},[playlists,userId,loaded]);

  const genres=useMemo(()=>{const v=new Set<string>();tracks.forEach(t=>[t.genre_primary,t.genre_secondary].forEach(x=>x&&v.add(x)));return ["Alle",...Array.from(v).sort((a,b)=>a.localeCompare(b,"de"))]},[tracks]);

  const filtered=useMemo(()=>{
    const n=query.trim().toLowerCase();
    return tracks.filter(t=>{
      const searchMatch=!n||[t.title,t.artist_name,t.genre_primary,t.genre_secondary,t.platform].filter(Boolean).some(v=>String(v).toLowerCase().includes(n));
      const genreMatch=n ? true : (genre==="Alle"||t.genre_primary===genre||t.genre_secondary===genre);
      return searchMatch&&genreMatch;
    });
  },[tracks,query,genre]);

  useEffect(()=>{
    if(query.trim() && filtered.length){setSelectedId(filtered[0].id);setAutoplay(false);}
  },[query,filtered]);

  const selected=tracks.find(t=>t.id===selectedId)??filtered[0]??null;
  const embed=selected?spotifyEmbed(selected,autoplay):null;
  const activePlaylist=playlists.find(p=>p.id===activePlaylistId)??playlists[0];
  const playlistTracks=activePlaylist?activePlaylist.trackIds.map(id=>tracks.find(t=>t.id===id)).filter((t):t is DiscoverTrack=>Boolean(t)):[];

  async function createPlaylist(){
    const name=newPlaylistName.trim();if(!name)return;
    if(userId){
      const {data}=await getSupabase().from("listener_playlists").insert({user_id:userId,name}).select("id,name").single();if(!data)return;
      const p={id:data.id,name:data.name,trackIds:[]};setPlaylists(c=>[...c,p]);setActivePlaylistId(p.id);
    }else{
      const p={id:crypto.randomUUID(),name,trackIds:[]};setPlaylists(c=>[...c,p]);setActivePlaylistId(p.id);
    }
    setNewPlaylistName("");
  }

  async function toggleTrack(trackId:number){
    if(!activePlaylist)return;
    const exists=activePlaylist.trackIds.includes(trackId);
    if(userId){
      const sb=getSupabase();
      if(exists)await sb.from("listener_playlist_tracks").delete().eq("playlist_id",activePlaylist.id).eq("track_id",trackId);
      else await sb.from("listener_playlist_tracks").insert({playlist_id:activePlaylist.id,track_id:trackId});
    }
    setPlaylists(c=>c.map(p=>p.id!==activePlaylist.id?p:{...p,trackIds:exists?p.trackIds.filter(id=>id!==trackId):[...p.trackIds,trackId]}));
  }

  function playTrack(trackId:number){setSelectedId(trackId);setAutoplay(true);}
  function openPlaylist(id:string){
    setActivePlaylistId(id);
    const p=playlists.find(x=>x.id===id);
    const first=p?.trackIds.map(trackId=>tracks.find(t=>t.id===trackId)).find((t):t is DiscoverTrack=>Boolean(t));
    if(first){setSelectedId(first.id);setAutoplay(true);}
  }

  return <section className={styles.wrap}>
    <div className={styles.hero}>
      <div className="eyebrow">MUSIK ENTDECKEN</div>
      <h1>Finden. Hören. Sammeln.</h1>
      <p>Ohne Registrierung nach Songs, Künstlern und Genres suchen. {userId?"Deine Playlists werden in deinem kostenlosen Account gespeichert.":"Playlists werden lokal auf diesem Gerät gespeichert."}</p>
      {!userId&&<div style={{marginTop:20,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}><Link href="/register?next=/music" style={{background:"var(--lime)",color:"#07100b",fontWeight:900,padding:"13px 18px",borderRadius:10}}>Kostenlosen Account erstellen</Link><Link href="/login?next=/music" style={{fontWeight:800}}>Schon registriert? Anmelden</Link></div>}
      {email&&<p style={{fontSize:13,marginTop:12}}>Angemeldet als {email} · Hörer-Account unabhängig vom Künstlerprofil</p>}
    </div>

    <div className={styles.controls}>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Song, Künstler oder Genre suchen …" aria-label="Musik suchen"/>
      <select value={genre} onChange={e=>setGenre(e.target.value)} aria-label="Genre filtern">{genres.map(i=><option value={i} key={i}>{i}</option>)}</select>
    </div>

    {selected&&<div className={styles.playerCard}>
      {embed?<iframe key={`${selected.id}-${autoplay?"auto":"manual"}`} src={embed} title={`${selected.title} Player`} loading="eager" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/>:<a className={styles.externalPlay} href={selected.track_url} target="_blank" rel="noreferrer">▶ Auf {selected.platform} hören</a>}
    </div>}

    <div className={styles.columns}>
      <div>
        <div className={styles.sectionHead}><h2>Ergebnisse</h2><span>{filtered.length}</span></div>
        <div className={styles.results}>
          {filtered.map(track=>{const inPlaylist=activePlaylist?.trackIds.includes(track.id)??false;return <article className={styles.track} key={track.id}>
            <button className={styles.trackMain} type="button" onClick={()=>playTrack(track.id)}><span className={styles.trackCover}>{track.cover_path?<img src={track.cover_path} alt=""/>:track.title.slice(0,1)}</span><span><strong>{track.title}</strong><small>{track.artist_name} · {[track.genre_primary,track.genre_secondary].filter(Boolean).join(" · ")||track.platform}</small></span></button>
            <button type="button" className={styles.addButton} onClick={()=>toggleTrack(track.id)}>{inPlaylist?"✓":"+"}</button>
          </article>})}
          {filtered.length===0&&<p className={styles.empty}>Keine passenden Songs gefunden.</p>}
        </div>
      </div>

      <aside className={styles.playlistPanel}>
        <div className={styles.sectionHead}><h2>Meine Playlists</h2></div>
        <div className={styles.newPlaylist}><input value={newPlaylistName} onChange={e=>setNewPlaylistName(e.target.value)} placeholder="Neue Playlist"/><button type="button" onClick={createPlaylist}>+</button></div>
        <div className={styles.playlistTabs}>{playlists.map(p=><button type="button" key={p.id} className={p.id===activePlaylistId?styles.activeTab:""} onClick={()=>openPlaylist(p.id)}>{p.name} <small>{p.trackIds.length}</small></button>)}</div>
        <div className={styles.playlistTracks}>{playlistTracks.map(t=><button type="button" key={t.id} onClick={()=>playTrack(t.id)}><strong>{t.title}</strong><small>{t.artist_name}</small></button>)}{playlistTracks.length===0&&<p>Noch keine Songs in dieser Playlist.</p>}</div>
        <p className={styles.localNote}>{userId?"Im kostenlosen Account gespeichert – auch auf anderen Geräten verfügbar.":"Ohne Konto bleibt die Playlist nur in diesem Browser gespeichert."}</p>
      </aside>
    </div>
  </section>;
}
