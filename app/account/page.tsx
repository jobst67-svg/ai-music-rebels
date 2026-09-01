"use client";

import Link from "next/link";
import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type ArtistProfile = {
  id: string;
  slug: string;
  artist_name: string | null;
  tagline: string | null;
  bio: string | null;
  image_path: string | null;
  accent_color: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  suno_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
};

export default function AccountPage() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Dein Profil wird geladen …");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        window.location.href = "/auth?next=/account";
        return;
      }
      setEmail(authData.user.email ?? "");
      const { data, error } = await supabase
        .from("artist_profiles")
        .select("id,slug,artist_name,tagline,bio,image_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (error) setMessage(error.message);
      else if (!data) setMessage("Du hast noch keine Subdomain reserviert.");
      else { setProfile(data); setMessage(""); }
    }
    load();
  }, []);

  function update<K extends keyof ArtistProfile>(key: K, value: ArtistProfile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setMessage("");
    const { error } = await getSupabase()
      .from("artist_profiles")
      .update({
        artist_name: profile.artist_name,
        tagline: profile.tagline,
        bio: profile.bio,
        image_path: profile.image_path,
        accent_color: profile.accent_color,
        spotify_url: profile.spotify_url,
        youtube_url: profile.youtube_url,
        suno_url: profile.suno_url,
        tiktok_url: profile.tiktok_url,
        facebook_url: profile.facebook_url
      })
      .eq("id", profile.id);

    setBusy(false);
    setMessage(error ? error.message : "Gespeichert. Dein Profil wird nach der Freischaltung öffentlich sichtbar.");
  }

  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei.");
    if (file.size > 30 * 1024 * 1024) throw new Error("Das Bild ist größer als 30 MB.");

    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Das Bild konnte nicht gelesen werden."));
      };
      image.src = url;
    });

    const maximum = 1600;
    const scale = Math.min(1, maximum / Math.max(source.naturalWidth, source.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Bildverarbeitung ist nicht verfügbar.");
    context.fillStyle = "#101116";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
    if (!blob) throw new Error("Das Bild konnte nicht verkleinert werden.");
    return new File([blob], "profile.jpg", { type: "image/jpeg" });
  }

  async function uploadImage(file: File) {
    if (!profile) return;
    setUploading(true);
    setMessage("");
    try {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Bitte melde dich erneut an.");
      const compressed = await compressImage(file);
      const path = `${authData.user.id}/profile.jpg`;
      const { error: uploadError } = await supabase.storage.from("artist-images").upload(path, compressed, {
        upsert: true,
        contentType: "image/jpeg",
        cacheControl: "3600"
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("artist-images").getPublicUrl(path);
      const imagePath = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await supabase
        .from("artist_profiles")
        .update({ image_path: imagePath })
        .eq("id", profile.id);
      if (profileError) throw profileError;
      update("image_path", imagePath);
      setMessage("Bild hochgeladen und verkleinert gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bild-Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  function dropImage(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void uploadImage(file);
  }

  async function signOut() {
    await getSupabase().auth.signOut();
    window.location.href = "/";
  }

  return (
    <main className="shell page account">
      <nav className="nav">
        <Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link>
        <div className="navlinks"><span>{email}</span><button className="textbutton" onClick={signOut}>Abmelden</button></div>
      </nav>
      <div className="eyebrow">Dein Künstlerbereich</div>
      <h1>Profil gestalten.</h1>
      {!profile ? <section className="card empty"><p>{message}</p><Link className="buttonlink" href="/">Subdomain sichern</Link></section> : (
        <form className="card editor" onSubmit={save}>
          <div className="editorhead">
            <div><h2>{profile.slug}.aimusicrebels.com</h2><p>Deine Daten speichern wir sofort. Öffentlich wird die Seite erst nach Freischaltung.</p></div>
            <Link className="outline" href="/account/preview">Vorschau</Link>
          </div>
          <div className="editgrid">
            <div><label htmlFor="artist">Künstlername</label><input id="artist" value={profile.artist_name ?? ""} onChange={(e) => update("artist_name", e.target.value)} /></div>
            <div><label htmlFor="tagline">Kurzer Satz</label><input id="tagline" value={profile.tagline ?? ""} onChange={(e) => update("tagline", e.target.value)} placeholder="Dein Sound in einem Satz" /></div>
            <div className="wide"><label htmlFor="bio">Bio</label><textarea id="bio" rows={5} value={profile.bio ?? ""} onChange={(e) => update("bio", e.target.value)} placeholder="Erzähl deine Geschichte, deinen Sound und was du machst." /></div>
            <div className="wide">
              <label htmlFor="image">Profilbild</label>
              <button className={`dropzone ${dragging ? "dragging" : ""}`} type="button" onClick={() => imageInput.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropImage}>
                {profile.image_path ? <img src={profile.image_path} alt="Profilbild-Vorschau" /> : <span>Bild hierher ziehen oder klicken</span>}
                <small>{uploading ? "Wird verkleinert und hochgeladen …" : "JPG, PNG oder WebP · automatisch auf max. 1.600 px verkleinert"}</small>
              </button>
              <input ref={imageInput} id="image" className="fileinput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.currentTarget.value = ""; }} />
            </div>
            <div><label htmlFor="color">Akzentfarbe</label><input id="color" type="color" value={profile.accent_color || "#d9ff3f"} onChange={(e) => update("accent_color", e.target.value)} /></div>
            <div><label htmlFor="spotify">Spotify-Link</label><input id="spotify" type="url" value={profile.spotify_url ?? ""} onChange={(e) => update("spotify_url", e.target.value)} placeholder="https://open.spotify.com/…" /></div>
            <div><label htmlFor="youtube">YouTube-Link</label><input id="youtube" type="url" value={profile.youtube_url ?? ""} onChange={(e) => update("youtube_url", e.target.value)} placeholder="https://youtube.com/…" /></div>
            <div><label htmlFor="suno">Suno-Link</label><input id="suno" type="url" value={profile.suno_url ?? ""} onChange={(e) => update("suno_url", e.target.value)} placeholder="https://suno.com/…" /></div>
            <div><label htmlFor="tiktok">TikTok-Link</label><input id="tiktok" type="url" value={profile.tiktok_url ?? ""} onChange={(e) => update("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@…" /></div>
            <div className="wide"><label htmlFor="facebook">Facebook-Link</label><input id="facebook" type="url" value={profile.facebook_url ?? ""} onChange={(e) => update("facebook_url", e.target.value)} placeholder="https://facebook.com/…" /></div>
          </div>
          <div className="savebar"><p className="note">{message}</p><button disabled={busy}>{busy ? "Speichert …" : "Änderungen speichern"}</button></div>
        </form>
      )}
    </main>
  );
}
