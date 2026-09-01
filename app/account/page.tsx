"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
            <Link className="outline" href={"/artist/" + profile.slug}>Vorschau</Link>
          </div>
          <div className="editgrid">
            <div><label htmlFor="artist">Künstlername</label><input id="artist" value={profile.artist_name ?? ""} onChange={(e) => update("artist_name", e.target.value)} /></div>
            <div><label htmlFor="tagline">Kurzer Satz</label><input id="tagline" value={profile.tagline ?? ""} onChange={(e) => update("tagline", e.target.value)} placeholder="Dein Sound in einem Satz" /></div>
            <div className="wide"><label htmlFor="bio">Bio</label><textarea id="bio" rows={5} value={profile.bio ?? ""} onChange={(e) => update("bio", e.target.value)} placeholder="Erzähl deine Geschichte, deinen Sound und was du machst." /></div>
            <div><label htmlFor="image">Bild-Link</label><input id="image" type="url" value={profile.image_path ?? ""} onChange={(e) => update("image_path", e.target.value)} placeholder="https://…" /></div>
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
