import { ProfileNav } from "@/components/profile-nav";
import { MusicBrowser, type DiscoverTrack } from "@/components/music-browser";
import { supabaseKey, supabaseUrl } from "@/lib/supabase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Musik entdecken | AI Music Rebels",
  description: "Durchsuche AI Music Rebels nach Spotify-Songs, Künstlern und Genres, höre verfügbare Tracks und stelle Playlists zusammen."
};

type ProfileRow = { id:string; slug:string; artist_name:string|null; genre_primary:string|null; genre_secondary:string|null };
type TrackRow = { id:number; artist_profile_id:string; platform:string; title:string; track_url:string; cover_path:string|null };
type SpotifyOEmbed = { thumbnail_url?: string | null };

async function query<T>(table:string, params:Record<string,string>):Promise<T[]> {
  if(!supabaseKey) return [];
  const response=await fetch(`${supabaseUrl}/rest/v1/${table}?${new URLSearchParams(params)}`,{headers:{apikey:supabaseKey,Authorization:`Bearer ${supabaseKey}`},next:{revalidate:60}});
  return response.ok ? response.json() as Promise<T[]> : [];
}

async function spotifyCover(trackUrl:string):Promise<string|null>{
  try{
    const parsed=new URL(trackUrl);
    if(!parsed.hostname.includes("spotify.com")) return null;
    const response=await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`,{next:{revalidate:86400}});
    if(!response.ok)return null;
    const data=await response.json() as SpotifyOEmbed;
    return data.thumbnail_url || null;
  }catch{return null;}
}

export default async function MusicPage(){
  const profiles=await query<ProfileRow>("artist_profiles",{is_published:"eq.true",select:"id,slug,artist_name,genre_primary,genre_secondary"});
  const ids=profiles.map(p=>p.id);
  const tracks=ids.length===0?[]:await query<TrackRow>("artist_tracks",{
    artist_profile_id:`in.(${ids.join(",")})`,
    platform:"ilike.Spotify",
    select:"id,artist_profile_id,platform,title,track_url,cover_path",
    order:"created_at.desc",
    limit:"500"
  });
  const profileMap=new Map(profiles.map(p=>[p.id,p]));
  const discoverTracks=(await Promise.all(tracks.map(async track=>{
    const profile=profileMap.get(track.artist_profile_id);
    if(!profile)return null;
    const cover=track.cover_path || await spotifyCover(track.track_url);
    return {id:track.id,platform:"Spotify",title:track.title,track_url:track.track_url,cover_path:cover,artist_name:profile.artist_name||profile.slug,artist_slug:profile.slug,genre_primary:profile.genre_primary,genre_secondary:profile.genre_secondary} satisfies DiscoverTrack;
  }))).filter((track):track is DiscoverTrack=>Boolean(track));
  return <main className="shell page"><ProfileNav variant="standard"/><MusicBrowser tracks={discoverTracks}/></main>;
}
