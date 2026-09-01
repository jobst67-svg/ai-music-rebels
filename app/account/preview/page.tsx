"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Profile = {
  artist_name: string | null;
  slug: string;
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

export default function AccountPreviewPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        window.location.href = "/auth?next=/account/preview";
        return;
      }
      const { data } = await supabase
        .from("artist_profiles")
        .select("artist_name,slug,tagline,bio,image_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      setProfile(data);
    }
    load();
  }, []);

  if (!profile) return <main className="shell page"><nav className="nav"><Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link></nav><p className="lead">Vorschau wird geladen …</p></main>;

  const name = profile.artist_name || profile.slug;
  const links = [["Spotify", profile.spotify_url], ["YouTube", profile.youtube_url], ["Suno", profile.suno_url], ["TikTok", profile.tiktok_url], ["Facebook", profile.facebook_url]].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return <main className="shell page"><nav className="nav"><Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link><div className="navlinks"><span>Private Vorschau</span><Link href="/account">Bearbeiten</Link></div></nav><article className="profile"><header className="profile-head"><div className="avatar" style={{ background: `linear-gradient(135deg, ${profile.accent_color || "#d9ff3f"}, #30372c)` }}>{profile.image_path ? <img src={profile.image_path} alt={name} /> : name.slice(0, 1)}</div><div><div className="eyebrow">AI Music Rebel · Vorschau</div><h1>{name}</h1><p className="tagline">{profile.tagline || "Independent AI music artist"}</p></div></header><p className="bio">{profile.bio || "Dieses Profil wird gerade aufgebaut."}</p>{links.length > 0 && <div className="links">{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer">{label} ↗</a>)}</div>}</article></main>;
}
