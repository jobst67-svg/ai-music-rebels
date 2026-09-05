import { NextResponse } from "next/server";
import { getBillingAdmin, getRequestUser, isAdminUser } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

const profileFields = "id,user_id,slug,artist_name,tagline,genre_primary,genre_secondary,bio,image_path,banner_path,accent_color,spotify_url,youtube_url,suno_url,tiktok_url,facebook_url,music_platforms,billing_status,channel_mode,stripe_customer_id,stripe_subscription_id,trial_started_at,trial_ends_at,winback_opt_in,created_at:updated_at,is_published,moderation_status,moderation_note,moderation_updated_at";
type AdminAction = "approve" | "unpublish" | "ban" | "unban" | "kick" | "warn" | "cancel_subscription";

async function requireAdmin(request: Request) {
  const user = await getRequestUser(request);
  return isAdminUser(user) ? user : null;
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
  try {
    const admin = getBillingAdmin();
    const [usersResult, profilesResult, warningsResult] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("artist_profiles").select(profileFields).order("updated_at", { ascending: false }),
      admin.from("admin_warnings").select("id,user_id,message,created_at").order("created_at", { ascending: false }).limit(5000)
    ]);
    if (usersResult.error) throw usersResult.error;
    if (profilesResult.error) throw profilesResult.error;
    if (warningsResult.error) throw warningsResult.error;

    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
    const warningMap = new Map<string, { count: number; latest: { message: string; created_at: string } | null }>();
    for (const warning of warningsResult.data ?? []) {
      const current = warningMap.get(warning.user_id) ?? { count: 0, latest: null };
      current.count += 1;
      if (!current.latest) current.latest = { message: warning.message, created_at: warning.created_at };
      warningMap.set(warning.user_id, current);
    }

    const users = usersResult.data.users.map((user) => {
      const warnings = warningMap.get(user.id);
      return {
        id: user.id, email: user.email ?? "", created_at: user.created_at, last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at, banned_until: user.banned_until, profile: profiles.get(user.id) ?? null,
        warning_count: warnings?.count ?? 0, latest_warning: warnings?.latest ?? null
      };
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));
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
    const body = await request.json() as { action?: AdminAction; userId?: string; message?: string };
    if (!body.userId || !body.action) return NextResponse.json({ error: "Ungültige Aktion." }, { status: 400 });
    if (body.userId === requester.id) return NextResponse.json({ error: "Das eigene Administratorkonto kann hier nicht geändert werden." }, { status: 400 });

    const admin = getBillingAdmin();
    const now = new Date().toISOString();
    const { data: profile, error: profileLookupError } = await admin.from("artist_profiles").select("id,moderation_status").eq("user_id", body.userId).maybeSingle();
    if (profileLookupError) throw profileLookupError;

    if (body.action === "warn") {
      const message = body.message?.trim();
      if (!message) return NextResponse.json({ error: "Eine Verwarnung braucht eine Nachricht." }, { status: 400 });
      if (message.length > 1000) return NextResponse.json({ error: "Die Verwarnung darf höchstens 1.000 Zeichen enthalten." }, { status: 400 });
      const { error } = await admin.from("admin_warnings").insert({ user_id: body.userId, admin_user_id: requester.id, message });
      if (error) throw error;
      return NextResponse.json({ message: "Verwarnung wurde gespeichert." });
    }

    if (body.action === "cancel_subscription") {
      if (!profile) return NextResponse.json({ error: "Für diesen Nutzer wurde kein Künstlerprofil gefunden." }, { status: 400 });
      const { data: billingProfile, error: billingError } = await admin.from("artist_profiles").select("stripe_subscription_id").eq("user_id", body.userId).maybeSingle();
      if (billingError) throw billingError;
      if (!billingProfile?.stripe_subscription_id) return NextResponse.json({ error: "Für diesen Nutzer ist kein aktives Stripe-Abo hinterlegt." }, { status: 400 });
      await getStripe().subscriptions.cancel(billingProfile.stripe_subscription_id);
      return NextResponse.json({ message: "Abo wurde bei Stripe gekündigt. Der Zugang wird durch das Stripe-Webhook auf das Basisprofil zurückgesetzt." });
    }

    if (!profile) return NextResponse.json({ error: "Für diesen Nutzer wurde kein Künstlerprofil gefunden." }, { status: 400 });

    const updateProfile = async (values: Record<string, unknown>) => {
      const { error } = await admin.from("artist_profiles").update({ ...values, moderation_updated_at: now, moderation_updated_by: requester.id }).eq("user_id", body.userId);
      if (error) throw error;
    };

    if (body.action === "approve") {
      const { data: target, error } = await admin.auth.admin.getUserById(body.userId);
      if (error) throw error;
      const banned = Boolean(target.user?.banned_until && target.user.banned_until !== "none" && new Date(target.user.banned_until).getTime() > Date.now());
      if (banned) return NextResponse.json({ error: "Der Nutzer ist noch gesperrt. Entsperre ihn zuerst." }, { status: 400 });
      await updateProfile({ is_published: true, moderation_status: "approved", moderation_note: null });
      return NextResponse.json({ message: "Profil wurde freigeschaltet und ist jetzt öffentlich." });
    }

    if (body.action === "unpublish") {
      await updateProfile({ is_published: false, moderation_status: "pending", moderation_note: "Vom Admin ausgeblendet." });
      return NextResponse.json({ message: "Profil wurde ausgeblendet." });
    }

    if (body.action === "ban") {
      const { error } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: "876000h" });
      if (error) throw error;
      await updateProfile({ is_published: false, moderation_status: "suspended", moderation_note: "Vom Admin gesperrt." });
      return NextResponse.json({ message: "Nutzer wurde gesperrt und das öffentliche Profil ausgeblendet." });
    }

    if (body.action === "unban") {
      const { error } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: "none" });
      if (error) throw error;
      await updateProfile({ is_published: false, moderation_status: "pending", moderation_note: "Sperre aufgehoben; Freischaltung erforderlich." });
      return NextResponse.json({ message: "Nutzersperre wurde aufgehoben. Das Profil bleibt bis zur bewussten Veröffentlichung privat." });
    }

    if (body.action === "kick") {
      const { error } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: "876000h" });
      if (error) throw error;
      await updateProfile({ is_published: false, moderation_status: "kicked", moderation_note: "Dauerhaft vom Rebels-Zugang ausgeschlossen." });
      return NextResponse.json({ message: "Nutzer wurde dauerhaft vom Rebels-Zugang ausgeschlossen." });
    }

    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    console.error("[admin/users] action failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Aktion konnte nicht ausgeführt werden." }, { status: 500 });
  }
}
