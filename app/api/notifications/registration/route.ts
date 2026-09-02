import { NextResponse } from "next/server";
import { getBillingAdmin, getRequestUser } from "@/lib/billing";
import { sendAdminEmail } from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user?.email) return NextResponse.json({ error: "Bitte melde dich erneut an." }, { status: 401 });
    const { profileId } = await request.json() as { profileId?: string };
    if (!profileId) return NextResponse.json({ error: "Profil fehlt." }, { status: 400 });
    const { data: profile } = await getBillingAdmin()
      .from("artist_profiles")
      .select("id,slug,artist_name")
      .eq("id", profileId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profil wurde nicht gefunden." }, { status: 404 });
    await sendAdminEmail({
      subject: "Neue Kanalregistrierung",
      content: `${profile.artist_name || profile.slug} (${user.email}) hat ${profile.slug}.aimusicrebels.com reserviert.`,
      preview: "Automatische Admin-Benachrichtigung",
      idempotencyKey: `admin-registration-${profile.id}`
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("[notifications/registration] failed", error);
    return NextResponse.json({ error: "Admin-Benachrichtigung konnte nicht gesendet werden." }, { status: 500 });
  }
}
