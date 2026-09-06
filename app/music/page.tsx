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

async function query<T>(table:string, params:Record<string,string>):Promise<T[]> {
  if(!supabaseKey) return [];
  const response=await fetch(`${supabaseUrl}/rest/v1/${table}?${new URLSearchParams(params)}`,{headers:{apikey:supabaseKey,Authorization:`Bearer ${supabaseKey}`},next:{revalidate:60}});
  return response.ok ? response.json() as Promise<T[]> : [];
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
  const discoverTracks:DiscoverTrack[]=tracks.flatMap(track=>{
    const profile=profileMap.get(track.artist_profile_id);
    if(!profile)return [];
    return [{id:track.id,platform:"Spotify",title:track.title,track_url:track.track_url,cover_path:track.cover_path,artist_name:profile.artist_name||profile.slug,artist_slug:profile.slug,genre_primary:profile.genre_primary,genre_secondary:profile.genre_secondary}];
  });
  return <main className="shell page"><ProfileNav variant="standard"/><MusicBrowser tracks={discoverTracks}/></main>;
}
