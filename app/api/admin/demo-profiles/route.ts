import { NextResponse } from "next/server";
import { getBillingAdmin, getRequestUser, isAdminUser } from "@/lib/billing";

const fields = "id,slug,artist_name,tagline,genre_primary,genre_secondary,bio,image_path,banner_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url,is_published,updated_at";

async function requireAdmin(request: Request) {
  const user = await getRequestUser(request);
  return isAdminUser(user) ? user : null;
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
  const admin = getBillingAdmin();
  const { data, error } = await admin.from("demo_artist_profiles").select(fields).order("artist_name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data ?? [] });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown> & { id?: string };
    if (!body.id) return NextResponse.json({ error: "Profil-ID fehlt." }, { status: 400 });
    const allowed = ["artist_name","tagline","genre_primary","genre_secondary","bio","image_path","banner_path","accent_color","spotify_url","youtube_url","suno_url","tiktok_url","facebook_url","is_published"];
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) if (key in body) update[key] = body[key];
    const admin = getBillingAdmin();
    const { data, error } = await admin.from("demo_artist_profiles").update(update).eq("id", body.id).select(fields).single();
    if (error) throw error;
    return NextResponse.json({ profile: data, message: "Demo-Profil gespeichert." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
  try {
    const body = await request.json() as { id?: string; slug?: string; target?: "profile" | "banner"; dataUrl?: string };
    if (!body.id || !body.slug || !body.target || !body.dataUrl) return NextResponse.json({ error: "Upload-Daten fehlen." }, { status: 400 });
    const match = body.dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) return NextResponse.json({ error: "Nur JPG, PNG oder WEBP sind erlaubt." }, { status: 400 });
    const mime = match[1];
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 5 * 1024 * 1024) return NextResponse.json({ error: "Das Bild darf maximal 5 MB groß sein." }, { status: 400 });
    const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
    const admin = getBillingAdmin();
    const path = `demo/${body.slug}/${body.target}.${ext}`;
    const { error: uploadError } = await admin.storage.from("artist-images").upload(path, bytes, { upsert: true, contentType: mime, cacheControl: "3600" });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = admin.storage.from("artist-images").getPublicUrl(path);
    const field = body.target === "banner" ? "banner_path" : "image_path";
    const publicUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    const { data, error } = await admin.from("demo_artist_profiles").update({ [field]: publicUrl, updated_at: new Date().toISOString() }).eq("id", body.id).select(fields).single();
    if (error) throw error;
    return NextResponse.json({ profile: data, message: "Bild gespeichert." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bild konnte nicht hochgeladen werden." }, { status: 500 });
  }
}
