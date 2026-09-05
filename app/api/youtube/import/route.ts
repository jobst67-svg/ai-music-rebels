import { NextResponse } from "next/server";
import { getBillingAdmin, getRequestUser } from "@/lib/billing";

type ChannelReference =
  | { filter: "id"; value: string }
  | { filter: "forHandle"; value: string }
  | { filter: "forUsername"; value: string };

type YouTubeChannelList = {
  items?: Array<{
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
};

type YouTubePlaylistItemsList = {
  nextPageToken?: string;
  items?: Array<{
    contentDetails?: { videoId?: string };
    snippet?: { title?: string; description?: string };
  }>;
};

function parseChannelReference(value: string): ChannelReference | null {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname)) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1]) return { filter: "id", value: parts[1] };
    if (parts[0]?.startsWith("@")) return { filter: "forHandle", value: parts[0] };
    if (parts[0] === "user" && parts[1]) return { filter: "forUsername", value: parts[1] };
    return null;
  } catch {
    return null;
  }
}

function isShortVideo(item: YouTubePlaylistItemsList["items"] extends Array<infer T> ? T : never) {
  const text = `${item.snippet?.title ?? ""}\n${item.snippet?.description ?? ""}`;
  return /\b#?(?:shorts?|ytshorts)\b/i.test(text) || /youtube\.com\/shorts\//i.test(text);
}

async function youtubeRequest<T>(resource: string, params: Record<string, string>) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("Für den YouTube-Import fehlt noch der YOUTUBE_API_KEY in Vercel.");

  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json() as { error?: { message?: string } } & T;
  if (!response.ok) throw new Error(data.error?.message || "YouTube konnte die Videos nicht laden.");
  return data;
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Bitte melde dich erneut an." }, { status: 401 });

    const body = await request.json().catch(() => ({})) as { channelUrl?: string };
    const admin = getBillingAdmin();
    const { data: profile, error: profileError } = await admin
      .from("artist_profiles")
      .select("id,user_id,youtube_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) return NextResponse.json({ error: "Dein Künstlerprofil wurde nicht gefunden." }, { status: 404 });

    const channelUrl = typeof body.channelUrl === "string" && body.channelUrl.trim()
      ? body.channelUrl.trim()
      : profile.youtube_url;
    if (!channelUrl) return NextResponse.json({ error: "Bitte speichere zuerst deinen YouTube-Kanal-Link." }, { status: 400 });

    const channelReference = parseChannelReference(channelUrl);
    if (!channelReference) {
      return NextResponse.json({ error: "Bitte verwende einen YouTube-Kanal-Link, zum Beispiel youtube.com/@deinname." }, { status: 400 });
    }

    const channelParams: Record<string, string> = {
      part: "contentDetails",
      [channelReference.filter]: channelReference.value
    };
    const channels = await youtubeRequest<YouTubeChannelList>("channels", channelParams);
    const uploadsPlaylistId = channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) return NextResponse.json({ error: "Der YouTube-Kanal konnte nicht gefunden werden." }, { status: 404 });

    const playlistItems: NonNullable<YouTubePlaylistItemsList["items"]> = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 5 && playlistItems.length < 250; page += 1) {
      const params: Record<string, string> = {
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: "50"
      };
      if (pageToken) params.pageToken = pageToken;
      const playlist = await youtubeRequest<YouTubePlaylistItemsList>("playlistItems", params);
      playlistItems.push(...(playlist.items ?? []));
      pageToken = playlist.nextPageToken;
      if (!pageToken) break;
    }

    const latestVideos = playlistItems
      .filter((item) => !isShortVideo(item))
      .map((item) => {
        const id = item.contentDetails?.videoId;
        if (!id) return null;
        return {
          youtube_id: id,
          youtube_url: `https://www.youtube.com/watch?v=${id}`,
          title: item.snippet?.title?.trim() || null
        };
      })
      .filter((video): video is { youtube_id: string; youtube_url: string; title: string | null } => Boolean(video))
      .slice(0, 10);

    if (latestVideos.length === 0) {
      return NextResponse.json({ error: "Auf diesem YouTube-Kanal wurden keine passenden Videos gefunden. Shorts werden übersprungen." }, { status: 404 });
    }

    const { data: existingVideos, error: existingError } = await admin
      .from("artist_videos")
      .select("id,youtube_id")
      .eq("artist_profile_id", profile.id);
    if (existingError) throw existingError;

    const existingById = new Map((existingVideos ?? []).map((video) => [video.youtube_id, video.id]));
    const importedAt = Date.now();

    for (const [index, video] of latestVideos.entries()) {
      const existingId = existingById.get(video.youtube_id);
      const values = {
        youtube_url: video.youtube_url,
        youtube_id: video.youtube_id,
        title: video.title,
        created_at: new Date(importedAt - index * 1000).toISOString()
      };

      if (existingId) {
        const { error } = await admin
          .from("artist_videos")
          .update(values)
          .eq("id", existingId)
          .eq("artist_profile_id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await admin
          .from("artist_videos")
          .insert({ ...values, artist_profile_id: profile.id, user_id: user.id });
        if (error) throw error;
      }
    }

    const { data: storedVideos, error: storedError } = await admin
      .from("artist_videos")
      .select("id")
      .eq("artist_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (storedError) throw storedError;

    const staleIds = (storedVideos ?? []).slice(10).map((video) => video.id);
    if (staleIds.length > 0) {
      const { error } = await admin
        .from("artist_videos")
        .delete()
        .eq("artist_profile_id", profile.id)
        .in("id", staleIds);
      if (error) throw error;
    }

    return NextResponse.json({
      message: `${latestVideos.length} YouTube-Videos wurden importiert. Shorts wurden übersprungen.`,
      videos: latestVideos
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube-Import fehlgeschlagen.";
    console.error("[youtube/import] failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
