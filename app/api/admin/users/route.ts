import { NextResponse } from "next/server";
import { getBillingAdmin, getRequestUser, isAdminUser } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

const profileFields = "id,user_id,slug,artist_name,tagline,bio,image_path,banner_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url,music_platforms,billing_status,channel_mode,stripe_customer_id,stripe_subscription_id,trial_started_at,trial_ends_at,winback_opt_in,created_at:updated_at,is_published";

async function requireAdmin(request: Request) {
  const user = await getRequestUser(request);
  return isAdminUser(user) ? user : null;
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });

  try {
    const admin = getBillingAdmin();
    const [usersResult, profilesResult] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("artist_profiles").select(profileFields).order("updated_at", { ascending: false })
    ]);
    if (usersResult.error) throw usersResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
    const users = usersResult.data.users.map((user) => ({
      id: user.id,
      email: user.email ?? "",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      banned_until: user.banned_until,
      profile: profiles.get(user.id) ?? null
    })).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[admin/users] list failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nutzerdaten konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const requester = await requireAdmin(request);
  if (!requester) return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });

  try {
    const body = await request.json() as { action?: "ban" | "unban" | "cancel_subscription"; userId?: string };
    if (!body.userId || !body.action) return NextResponse.json({ error: "Ungültige Aktion." }, { status: 400 });
    if (body.userId === requester.id) return NextResponse.json({ error: "Das eigene Administratorkonto kann hier nicht geändert werden." }, { status: 400 });

    const admin = getBillingAdmin();
    if (body.action === "ban") {
      const { error } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: "876000h" });
      if (error) throw error;
      const { error: profileError } = await admin.from("artist_profiles").update({ is_published: false }).eq("user_id", body.userId);
      if (profileError) throw profileError;
      return NextResponse.json({ message: "Nutzer wurde gesperrt und das öffentliche Profil ausgeblendet." });
    }

    if (body.action === "unban") {
      const { error } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: "none" });
      if (error) throw error;
      return NextResponse.json({ message: "Nutzersperre wurde aufgehoben. Das Profil bleibt bis zur bewussten Veröffentlichung privat." });
    }

    const { data: profile, error: profileError } = await admin
      .from("artist_profiles")
      .select("id,stripe_subscription_id")
      .eq("user_id", body.userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.stripe_subscription_id) return NextResponse.json({ error: "Für diesen Nutzer ist kein aktives Stripe-Abo hinterlegt." }, { status: 400 });
    await getStripe().subscriptions.cancel(profile.stripe_subscription_id);
    return NextResponse.json({ message: "Abo wurde bei Stripe gekündigt. Der Zugang wird durch das Stripe-Webhook auf das Basisprofil zurückgesetzt." });
  } catch (error) {
    console.error("[admin/users] action failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Aktion konnte nicht ausgeführt werden." }, { status: 500 });
  }
}
