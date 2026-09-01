"use client";

import Link from "next/link";
import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ArtistTrack, TrackShelf } from "@/components/track-shelf";
import { ChannelVideo, VideoShelf } from "@/components/video-shelf";
import { getSupabase } from "@/lib/supabase";

type ArtistProfile = {
  id: string;
  slug: string;
  artist_name: string | null;
  tagline: string | null;
  bio: string | null;
  image_path: string | null;
  banner_path: string | null;
  accent_color: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  suno_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  music_platforms: string[];
};

type ImageTarget = "profile" | "banner" | "track";
const platforms = ["Suno", "Udio", "Spotify", "YouTube", "YouTube Music", "SoundCloud", "Bandcamp", "Boomy", "AIVA", "Mubert", "Riffusion", "Andere"];

function youtubeId(value: string) {
  try {
    const url = new URL(value.trim());
    const id = url.hostname.includes("youtu.be") ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
    return id?.match(/^[A-Za-z0-9_-]{11}$/)?.[0] ?? null;
  } catch {
    return null;
  }
}

export default function AccountPage() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [videos, setVideos] = useState<ChannelVideo[]>([]);
  const [tracks, setTracks] = useState<ArtistTrack[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Dein Profil wird geladen …");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<ImageTarget | null>(null);
  const [dragging, setDragging] = useState<ImageTarget | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [trackPlatform, setTrackPlatform] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [trackCover, setTrackCover] = useState<string | null>(null);
  const [addingTrack, setAddingTrack] = useState(false);
  const [trackEditorOpen, setTrackEditorOpen] = useState(false);
  const profileInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const trackCoverInput = useRef<HTMLInputElement>(null);

  async function loadVideos(profileId: string) {
    const { data } = await getSupabase().from("artist_videos").select("id,youtube_id,youtube_url,title").eq("artist_profile_id", profileId).order("created_at", { ascending: false });
    setVideos(data ?? []);
  }

  async function loadTracks(profileId: string) {
    const { data } = await getSupabase().from("artist_tracks").select("id,platform,title,track_url,cover_path").eq("artist_profile_id", profileId).order("created_at", { ascending: false }).limit(12);
    setTracks(data ?? []);
  }

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        window.location.href = "/auth?next=/account";
        return;
      }
      setEmail(authData.user.email ?? "");
      const { data, error } = await supabase.from("artist_profiles").select("id,slug,artist_name,tagline,bio,image_path,banner_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url,music_platforms").eq("user_id", authData.user.id).maybeSingle();
      if (error) setMessage(error.message);
      else if (!data) setMessage("Du hast noch keine Subdomain reserviert.");
      else {
        setProfile(data);
        setMessage("");
        void loadVideos(data.id);
        void loadTracks(data.id);
      }
    }
    void load();
  }, []);

  function update<K extends keyof ArtistProfile>(key: K, value: ArtistProfile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setMessage("");
    const { error } = await getSupabase().from("artist_profiles").update({
      artist_name: profile.artist_name, tagline: profile.tagline, bio: profile.bio, image_path: profile.image_path, banner_path: profile.banner_path,
      accent_color: profile.accent_color, spotify_url: profile.spotify_url, youtube_url: profile.youtube_url, suno_url: profile.suno_url, tiktok_url: profile.tiktok_url, facebook_url: profile.facebook_url, music_platforms: profile.music_platforms
    }).eq("id", profile.id);
    setBusy(false);
    setMessage(error ? error.message : "Gespeichert. Dein Kanal wird nach der Freischaltung öffentlich sichtbar.");
  }

  async function compressImage(file: File, target: ImageTarget): Promise<File> {
    if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei.");
    if (file.size > 30 * 1024 * 1024) throw new Error("Das Bild ist größer als 30 MB.");
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Das Bild konnte nicht gelesen werden.")); };
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    const isProfileImage = target === "profile";
    const maxWidth = target === "banner" ? 1920 : target === "track" ? 1000 : 1200;
    const maxHeight = target === "banner" ? 800 : target === "track" ? 1000 : 1200;
    const sourceCrop = isProfileImage ? Math.min(source.naturalWidth, source.naturalHeight) : null;
    const scale = sourceCrop
      ? Math.min(1, maxWidth / sourceCrop)
      : Math.min(1, maxWidth / source.naturalWidth, maxHeight / source.naturalHeight);
    canvas.width = sourceCrop ? Math.max(1, Math.round(sourceCrop * scale)) : Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = sourceCrop ? canvas.width : Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Bildverarbeitung ist nicht verfügbar.");
    context.fillStyle = "#101116";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (sourceCrop) {
      const sourceX = Math.round((source.naturalWidth - sourceCrop) / 2);
      const sourceY = Math.round((source.naturalHeight - sourceCrop) / 2);
      context.drawImage(source, sourceX, sourceY, sourceCrop, sourceCrop, 0, 0, canvas.width, canvas.height);
    } else {
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
    }
    const toBlob = (quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    let blob = await toBlob(0.84);
    if (blob && blob.size > 4_500_000) blob = await toBlob(0.65);
    if (!blob) throw new Error("Das Bild konnte nicht verkleinert werden.");
    return new File([blob], `${target}.jpg`, { type: "image/jpeg" });
  }

  async function uploadImage(file: File, target: ImageTarget) {
    if (!profile) return;
    setUploading(target);
    setMessage("");
    try {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Bitte melde dich erneut an.");
      const compressed = await compressImage(file, target);
      const path = `${authData.user.id}/${target}.jpg`;
      const { error: uploadError } = await supabase.storage.from("artist-images").upload(path, compressed, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("artist-images").getPublicUrl(path);
      const field = target === "banner" ? "banner_path" : "image_path";
      const imagePath = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await supabase.from("artist_profiles").update({ [field]: imagePath }).eq("id", profile.id);
      if (profileError) throw profileError;
      update(field, imagePath);
      setMessage(target === "banner" ? "Kanalbanner hochgeladen und verkleinert gespeichert." : "Kanalbild hochgeladen und verkleinert gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bild-Upload fehlgeschlagen.");
    } finally {
      setUploading(null);
    }
  }

  function dropImage(event: DragEvent<HTMLButtonElement>, target: ImageTarget) {
    event.preventDefault();
    setDragging(null);
    const file = event.dataTransfer.files[0];
    if (file) void uploadImage(file, target);
  }

  async function addVideo() {
    if (!profile) return;
    const id = youtubeId(videoUrl);
    if (!id) {
      setMessage("Bitte füge einen gültigen YouTube-Link ein.");
      return;
    }
    setAddingVideo(true);
    try {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Bitte melde dich erneut an.");
      const { error } = await supabase.from("artist_videos").insert({ artist_profile_id: profile.id, user_id: authData.user.id, youtube_url: videoUrl.trim(), youtube_id: id, title: videoTitle.trim() || null });
      if (error) throw error;
      setVideoUrl("");
      setVideoTitle("");
      await loadVideos(profile.id);
      setMessage("Video hinzugefügt. Ab dem sechsten Video wird das älteste automatisch entfernt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Video konnte nicht gespeichert werden.");
    } finally {
      setAddingVideo(false);
    }
  }

  async function deleteVideo(id: number) {
    const { error } = await getSupabase().from("artist_videos").delete().eq("id", id);
    if (error) setMessage(error.message);
    else if (profile) void loadVideos(profile.id);
  }

  async function uploadTrackCover(file: File) {
    setUploading("track");
    setMessage("");
    try {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Bitte melde dich erneut an.");
      const compressed = await compressImage(file, "track");
      const path = `${authData.user.id}/tracks/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from("artist-images").upload(path, compressed, { contentType: "image/jpeg", cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("artist-images").getPublicUrl(path);
      setTrackCover(`${data.publicUrl}?v=${Date.now()}`);
      setMessage("Cover hochgeladen und verkleinert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cover-Upload fehlgeschlagen.");
    } finally {
      setUploading(null);
    }
  }

  async function addTrack() {
    if (!profile) return;
    if (!trackPlatform) {
      setMessage("Wähle zuerst eine Musikplattform aus.");
      return;
    }
    if (!trackTitle.trim() || !trackUrl.trim()) {
      setMessage("Titel und Link sind erforderlich.");
      return;
    }
    if (tracks.length >= 12) {
      setMessage("Du hast bereits 12 Titel. Entferne zuerst einen Titel, bevor du einen neuen hinzufügst.");
      return;
    }
    setAddingTrack(true);
    try {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Bitte melde dich erneut an.");
      const { error } = await supabase.from("artist_tracks").insert({ artist_profile_id: profile.id, user_id: authData.user.id, platform: trackPlatform, title: trackTitle.trim(), track_url: trackUrl.trim(), cover_path: trackCover });
      if (error) throw error;
      setTrackTitle("");
      setTrackUrl("");
      setTrackCover(null);
      setTrackEditorOpen(false);
      await loadTracks(profile.id);
      setMessage("Titel hinzugefügt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Titel konnte nicht gespeichert werden.");
    } finally {
      setAddingTrack(false);
    }
  }

  async function deleteTrack(id: number) {
    const { error } = await getSupabase().from("artist_tracks").delete().eq("id", id);
    if (error) setMessage(error.message);
    else if (profile) void loadTracks(profile.id);
  }

  async function signOut() {
    await getSupabase().auth.signOut();
    window.location.href = "/";
  }

  const dropzone = (target: ImageTarget, label: string, path: string | null, ref: React.RefObject<HTMLInputElement | null>) => <div className="wide"><label>{label}</label><button className={`dropzone ${target === "profile" ? "profile-dropzone" : ""} ${dragging === target ? "dragging" : ""}`} type="button" onClick={() => ref.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(target); }} onDragLeave={() => setDragging(null)} onDrop={(event) => dropImage(event, target)}>{path ? <img src={path} alt={`${label}-Vorschau`} /> : <span>Bild hierher ziehen oder klicken</span>}<small>{uploading === target ? "Wird verkleinert und hochgeladen …" : target === "banner" ? "JPG, PNG oder WebP · automatisch auf max. 1.920 × 800 px verkleinert" : target === "profile" ? "JPG, PNG oder WebP · quadratisch zugeschnitten und auf max. 1.200 × 1.200 px verkleinert" : "JPG, PNG oder WebP · automatisch auf max. 1.600 px verkleinert"}</small></button><input ref={ref} className="fileinput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, target); event.currentTarget.value = ""; }} /></div>;

  return <main className="shell page account">
    <nav className="nav"><Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link><div className="navlinks"><span>{email}</span><button className="textbutton" onClick={signOut}>Abmelden</button></div></nav>
    <div className="eyebrow">Dein Künstlerbereich</div><h1>Profil gestalten.</h1>
    {!profile ? <section className="card empty"><p>{message}</p><Link className="buttonlink" href="/">Subdomain sichern</Link></section> : <form className="card editor" onSubmit={save}>
      <div className="editorhead"><div><h2>{profile.slug}.aimusicrebels.com</h2><p>Deine Daten speichern wir sofort. Öffentlich wird die Seite erst nach Freischaltung.</p></div><Link className="outline" href="/account/preview">Vorschau</Link></div>
      <div className="editgrid">
        {dropzone("banner", "Kanalbanner", profile.banner_path, bannerInput)}
        {dropzone("profile", "Kanalbild", profile.image_path, profileInput)}
        <div><label htmlFor="artist">Künstlername</label><input id="artist" value={profile.artist_name ?? ""} onChange={(e) => update("artist_name", e.target.value)} /></div>
        <div><label htmlFor="tagline">Kurzer Satz</label><input id="tagline" value={profile.tagline ?? ""} onChange={(e) => update("tagline", e.target.value)} placeholder="Dein Sound in einem Satz" /></div>
        <div className="wide"><label htmlFor="bio">Bio</label><textarea id="bio" rows={5} value={profile.bio ?? ""} onChange={(e) => update("bio", e.target.value)} placeholder="Erzähl deine Geschichte, deinen Sound und was du machst." /></div>
        <div className="wide"><label>Wo veröffentlichst du deine Musik?</label><div className="platform-picker">{platforms.map((platform) => <button type="button" key={platform} className={profile.music_platforms.includes(platform) ? "active" : ""} onClick={() => update("music_platforms", profile.music_platforms.includes(platform) ? profile.music_platforms.filter((item) => item !== platform) : [...profile.music_platforms, platform])}>{platform}</button>)}</div></div>
        <div><label htmlFor="color">Akzentfarbe</label><input id="color" type="color" value={profile.accent_color || "#d9ff3f"} onChange={(e) => update("accent_color", e.target.value)} /></div>
        <div><label htmlFor="spotify">Spotify-Link</label><input id="spotify" type="url" value={profile.spotify_url ?? ""} onChange={(e) => update("spotify_url", e.target.value)} placeholder="https://open.spotify.com/…" /></div>
        <div><label htmlFor="youtube">YouTube-Kanal-Link</label><input id="youtube" type="url" value={profile.youtube_url ?? ""} onChange={(e) => update("youtube_url", e.target.value)} placeholder="https://youtube.com/@…" /></div>
        <div><label htmlFor="suno">Suno-Link</label><input id="suno" type="url" value={profile.suno_url ?? ""} onChange={(e) => update("suno_url", e.target.value)} placeholder="https://suno.com/…" /></div>
        <div><label htmlFor="tiktok">TikTok-Link</label><input id="tiktok" type="url" value={profile.tiktok_url ?? ""} onChange={(e) => update("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@…" /></div>
        <div className="wide"><label htmlFor="facebook">Facebook-Link</label><input id="facebook" type="url" value={profile.facebook_url ?? ""} onChange={(e) => update("facebook_url", e.target.value)} placeholder="https://facebook.com/…" /></div>
      </div>
      <section className="video-manager"><div className="section-title"><div><div className="eyebrow">YouTube</div><h2>Deine Videos</h2></div><span>{videos.length}/5</span></div><p>Füge bis zu fünf Videos ein. Beim sechsten wird das älteste automatisch entfernt.</p><div className="video-form"><input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="YouTube-Video-Link" /><input value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} placeholder="Titel (optional)" /><button type="button" disabled={addingVideo} onClick={addVideo}>{addingVideo ? "Wird hinzugefügt …" : "Video hinzufügen"}</button></div><VideoShelf videos={videos} editable onDelete={deleteVideo} /></section>
      <section className="track-manager">
        <div className="section-title"><div><div className="eyebrow">Songs</div><h2>Deine Titel</h2></div><span>{tracks.length}/12</span></div>
        <p>Lege Titel für die Plattformen an, die du oben ausgewählt hast. Ein Klick auf die Karte führt direkt zum Song.</p>
        {profile.music_platforms.length === 0 ? <p className="note">Wähle oben mindestens eine Musikplattform aus.</p> : <>
          <button type="button" className="add-track-button" onClick={() => setTrackEditorOpen((open) => !open)}>{trackEditorOpen ? "Eingabe schließen" : "+ Neue Titelkarte"}</button>
          {trackEditorOpen && <div className="track-editor">
            <div className="track-form">
              <select value={trackPlatform} onChange={(event) => setTrackPlatform(event.target.value)}><option value="">Plattform auswählen</option>{profile.music_platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}</select>
              <input value={trackTitle} onChange={(event) => setTrackTitle(event.target.value)} placeholder="Songtitel" />
              <input className="wide" value={trackUrl} onChange={(event) => setTrackUrl(event.target.value)} placeholder="Direkter Link zum Song" />
              <div className="wide"><label>Cover (optional)</label><button type="button" className={"dropzone track-cover-upload " + (dragging === "track" ? "dragging" : "")} onClick={() => trackCoverInput.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging("track"); }} onDragLeave={() => setDragging(null)} onDrop={(event) => { event.preventDefault(); setDragging(null); const file = event.dataTransfer.files[0]; if (file) void uploadTrackCover(file); }}>{trackCover ? <img src={trackCover} alt="Cover-Vorschau" /> : <span>Cover hierher ziehen oder klicken</span>}<small>{uploading === "track" ? "Cover wird verkleinert …" : "JPG, PNG oder WebP · automatisch auf max. 1.000 px verkleinert"}</small></button><input ref={trackCoverInput} className="fileinput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadTrackCover(file); event.currentTarget.value = ""; }} /></div>
            </div>
            <div className="track-add"><button type="button" disabled={addingTrack} onClick={addTrack}>{addingTrack ? "Wird hinzugefügt …" : "Titel hinzufügen"}</button></div>
          </div>}
        </>}
        <TrackShelf tracks={tracks} editable onDelete={deleteTrack} />
      </section>
      <div className="savebar"><p className="note">{message}</p><div className="save-actions"><Link className="outline" href="/account/preview">Profil-Vorschau</Link><button disabled={busy}>{busy ? "Speichert …" : "Änderungen speichern"}</button></div></div>
    </form>}
  </main>;
}
