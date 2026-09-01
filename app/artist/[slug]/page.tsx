import Link from "next/link";
import { supabaseKey, supabaseUrl } from "@/lib/supabase";

type ArtistProfile = {
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

async function findArtist(slug: string): Promise<ArtistProfile | null> {
  if (!supabaseKey) return null;
  const query = new URLSearchParams({ slug: `eq.${slug}`, is_published: "eq.true", select: "artist_name,slug,tagline,bio,image_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url" });
  const response = await fetch(`${supabaseUrl}/rest/v1/artist_profiles?${query}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    next: { revalidate: 60 }
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as ArtistProfile[];
  return rows[0] ?? null;
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await findArtist(slug);
  const demo = slug === "lunar-vein";
  const profile = artist ?? (demo ? {
    artist_name: "LUNAR VEIN", slug, tagline: "Dark alternative music from the edge of the signal.",
    bio: "Lunar Vein verbindet dunkle Melodien, raue Gitarren und elektronische Schatten zu einer eigenen Klangwelt.",
    image_path: null, accent_color: "#d9ff3f", spotify_url: null, youtube_url: null, suno_url: null, tiktok_url: null, facebook_url: null
  } satisfies ArtistProfile : null);

  if (!profile) {
    return <main className="shell page"><nav className="nav"><Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link></nav><section className="profile"><div className="eyebrow">404</div><h1>Profil nicht gefunden.</h1><p className="lead">Diese Künstlerseite ist noch nicht veröffentlicht oder existiert nicht.</p></section></main>;
  }

  const name = profile.artist_name || profile.slug;
  const links = [
    ["Spotify", profile.spotify_url], ["YouTube", profile.youtube_url], ["Suno", profile.suno_url], ["TikTok", profile.tiktok_url], ["Facebook", profile.facebook_url]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <main className="shell page">
      <nav className="nav"><Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link><div className="navlinks"><Link href="/auth">Account</Link></div></nav>
      <article className="profile">
        <header className="profile-head">
          <div className="avatar" style={{ background: `linear-gradient(135deg, ${profile.accent_color || "#d9ff3f"}, #30372c)` }}>
            {profile.image_path ? <img src={profile.image_path} alt={name} /> : name.slice(0, 1)}
          </div>
          <div><div className="eyebrow">AI Music Rebel</div><h1>{name}</h1><p className="tagline">{profile.tagline || "Independent AI music artist"}</p></div>
        </header>
        <p className="bio">{profile.bio || "Dieses Profil wird gerade aufgebaut."}</p>
        {links.length > 0 && <div className="links">{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer">{label} ↗</a>)}</div>}
      </article>
    </main>
  );
}
