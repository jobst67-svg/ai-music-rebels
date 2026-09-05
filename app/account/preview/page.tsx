"use client";

import { useEffect, useState } from "react";
import { ArtistTrack } from "@/components/track-shelf";
import { ChannelVideo } from "@/components/video-shelf";
import { PublicProfile } from "@/components/public-profile";
import { getSupabase } from "@/lib/supabase";
import { ProfileNav } from "@/components/profile-nav";

type Profile = {
  id: string;
  artist_name: string | null;
  slug: string;
  tagline: string | null;
  genre_primary: string | null;
  genre_secondary: string | null;
  bio: string | null;
  image_path: string | null;
  banner_path: string | null;
  accent_color: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  suno_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  channel_mode: "full" | "basic";
  moderation_status: "pending" | "approved" | "suspended" | "kicked";
};

export default function AccountPreviewPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<ChannelVideo[]>([]);
  const [tracks, setTracks] = useState<ArtistTrack[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        window.location.href = "/auth?next=/account/preview";
        return;
      }
      const { data } = await supabase.from("artist_profiles").select("id,artist_name,slug,tagline,genre_primary,genre_secondary,bio,image_path,banner_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url,channel_mode,moderation_status").eq("user_id", authData.user.id).maybeSingle();
      if (!data) return;
      setProfile(data);
      const { data: videoData } = await supabase.from("artist_videos").select("id,youtube_id,youtube_url,title").eq("artist_profile_id", data.id).order("created_at", { ascending: false });
      setVideos(videoData ?? []);
      const { data: trackData } = await supabase.from("artist_tracks").select("id,platform,title,track_url,cover_path").eq("artist_profile_id", data.id).order("created_at", { ascending: false }).limit(12);
      setTracks(trackData ?? []);
    }
    load();
  }, []);

  if (!profile) return <main className="shell page"><ProfileNav variant="profile" accountHref="/account" accountLabel="Bearbeiten" /><p className="lead">Vorschau wird geladen …</p></main>;

  const name = profile.artist_name || profile.slug;
  const links = [["Spotify", profile.spotify_url], ["YouTube", profile.youtube_url], ["Suno", profile.suno_url], ["TikTok", profile.tiktok_url], ["Facebook", profile.facebook_url]].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return <main className="shell page channel-page"><ProfileNav variant="profile" accountHref="/account" accountLabel="Bearbeiten" /><article className="channel"><div className="channel-banner" style={{ background: profile.banner_path ? undefined : `linear-gradient(120deg, ${profile.accent_color || "#d9ff3f"}, #151a11 45%, #101116)` }}>{profile.banner_path && <img src={profile.banner_path} alt={`${name} Kanalbanner`} />}</div><header className="channel-head"><div className="channel-avatar" style={{ background: `linear-gradient(135deg, ${profile.accent_color || "#d9ff3f"}, #30372c)` }}>{profile.image_path ? <img src={profile.image_path} alt={name} /> : name.slice(0, 1)}</div><div><div className="eyebrow">AI Music Rebel · Vorschau</div><h1>{name}</h1><p className="tagline">{profile.tagline || "Independent AI music artist"}</p>{(profile.genre_primary || profile.genre_secondary) && <div className="genre-tags">{[profile.genre_primary, profile.genre_secondary].filter(Boolean).map((genre) => <span className="genre-pill" key={genre}>{genre}</span>)}</div>}</div></header><PublicProfile profile={profile} name={name} links={links} tracks={tracks} videos={videos} showViewSwitch={profile.moderation_status === "approved"} initialView={profile.channel_mode === "full" ? "premium" : "free"} /></article></main>;
}
