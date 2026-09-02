import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getBillingAdmin, isFullChannel, statusFromStripe } from "@/lib/billing";
import { sendAdminEmail, sendBillingEmail } from "@/lib/resend";
import { getStripe } from "@/lib/stripe";

function webhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Der Stripe-Webhook ist noch nicht eingerichtet.");
  return secret;
}

type Profile = { id: string; user_id: string; artist_name: string | null };

async function sendToProfile(profile: Profile, email: Omit<Parameters<typeof sendBillingEmail>[0], "to">) {
  try {
    const { data: auth } = await getBillingAdmin().auth.admin.getUserById(profile.user_id);
    if (auth.user?.email) await sendBillingEmail({ ...email, to: auth.user.email });
  } catch (error) {
    console.error("[billing/email] failed", { profileId: profile.id, message: error instanceof Error ? error.message : "Unknown error" });
  }
}

async function setSubscription(subscription: Stripe.Subscription) {
  const admin = getBillingAdmin();
  const profileId = subscription.metadata.artist_profile_id;
  const status = statusFromStripe(subscription.status);
  const query = profileId ? admin.from("artist_profiles").select("id,user_id,artist_name").eq("id", profileId) : admin.from("artist_profiles").select("id,user_id,artist_name").eq("stripe_subscription_id", subscription.id);
  const { data: profile } = await query.maybeSingle<Profile>();
  if (!profile) return null;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  await admin.from("artist_profiles").update({
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    billing_status: status,
    channel_mode: isFullChannel(status) ? "full" : "basic",
    trial_started_at: subscription.status === "trialing" ? new Date().toISOString() : undefined,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
  }).eq("id", profile.id);

  return profile;
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Signatur fehlt." }, { status: 400 });
    const event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret());
    const admin = getBillingAdmin();
    const { error: eventError } = await admin.from("stripe_webhook_events").insert({ id: event.id, event_type: event.type });
    if (eventError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    if (eventError) throw eventError;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") {
        const subscription = await getStripe().subscriptions.retrieve(session.subscription);
        const profile = await setSubscription(subscription);
        if (profile) await sendToProfile(profile, {
          subject: subscription.status === "trialing" ? "Dein kostenloser Monat startet jetzt" : "Dein Künstlerkanal ist aktiviert",
          content: subscription.status === "trialing"
            ? "Deine Zahlungsdaten sind gespeichert und dein Künstlerkanal ist jetzt für 30 Tage vollständig freigeschaltet. Vor Ablauf des kostenlosen Monats erinnern wir dich per E-Mail."
            : "Deine Zahlungsdaten sind gespeichert und dein Künstlerkanal ist vollständig freigeschaltet.",
          preview: "Du kannst dein Abo jederzeit im Künstlerbereich verwalten.",
          idempotencyKey: `subscription-started-${subscription.id}`
        });
        if (profile) await sendAdminEmail({
          subject: "Neue Kanalaktivierung",
          content: `${profile.artist_name || "Ein Nutzer"} hat den kostenlosen Monat für den Künstlerkanal ${profile.id} gestartet.`,
          preview: "Automatische Admin-Benachrichtigung",
          idempotencyKey: `admin-subscription-started-${subscription.id}`
        });
      }
    }
    if (event.type === "customer.subscription.updated") await setSubscription(event.data.object as Stripe.Subscription);
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const profile = await setSubscription(subscription);
      if (profile) await sendToProfile(profile, {
        subject: "Dein Abo wurde beendet",
        content: "Dein Künstlerkanal läuft jetzt als Basisprofil weiter. Banner, Bio und Links bleiben sichtbar; deine Titel und Videos bleiben gespeichert und werden bei einer Reaktivierung sofort wieder angezeigt.",
        preview: "Du kannst deinen Kanal jederzeit im Künstlerbereich reaktivieren.",
        idempotencyKey: `subscription-cancelled-${subscription.id}`
      });
      if (profile) await sendAdminEmail({
        subject: "Kanalabo beendet",
        content: `${profile.artist_name || "Ein Nutzer"} hat das Abo für den Künstlerkanal ${profile.id} beendet. Das Profil läuft nun im Basisprofil weiter.`,
        preview: "Automatische Admin-Benachrichtigung",
        idempotencyKey: `admin-subscription-cancelled-${subscription.id}`
      });
    }
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
      if (subscriptionId) {
        const { data: profile } = await admin.from("artist_profiles").select("id,user_id,artist_name").eq("stripe_subscription_id", subscriptionId).maybeSingle<Profile>();
        await admin.from("artist_profiles").update({ billing_status: "past_due" }).eq("stripe_subscription_id", subscriptionId);
        if (profile) await sendToProfile(profile, {
          subject: "Deine Zahlung konnte nicht verarbeitet werden",
          content: "Bitte prüfe deine Zahlungsdaten im Künstlerbereich. Dein Kanal bleibt zunächst erreichbar, damit du alles ohne Unterbrechung regeln kannst.",
          preview: "Du kannst deine Zahlungsdaten jederzeit über „Abo verwalten“ aktualisieren.",
          idempotencyKey: `payment-failed-${invoice.id}`
        });
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook konnte nicht verarbeitet werden." }, { status: 400 });
  }
}
