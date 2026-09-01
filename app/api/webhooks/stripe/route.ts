import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getBillingAdmin, isFullChannel, statusFromStripe } from "@/lib/billing";
import { sendBillingEmail } from "@/lib/resend";
import { getStripe } from "@/lib/stripe";

function webhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Der Stripe-Webhook ist noch nicht eingerichtet.");
  return secret;
}

async function setSubscription(subscription: Stripe.Subscription) {
  const admin = getBillingAdmin();
  const profileId = subscription.metadata.artist_profile_id;
  const status = statusFromStripe(subscription.status);
  const query = profileId ? admin.from("artist_profiles").select("id,user_id,artist_name").eq("id", profileId) : admin.from("artist_profiles").select("id,user_id,artist_name").eq("stripe_subscription_id", subscription.id);
  const { data: profile } = await query.maybeSingle();
  if (!profile) return;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  await admin.from("artist_profiles").update({
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    billing_status: status,
    channel_mode: isFullChannel(status) ? "full" : "basic",
    trial_started_at: subscription.status === "trialing" ? new Date().toISOString() : undefined,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
  }).eq("id", profile.id);

  if (!isFullChannel(status)) {
    const { data: auth } = await admin.auth.admin.getUserById(profile.user_id);
    if (auth.user?.email) await sendBillingEmail({
      to: auth.user.email,
      subject: "Dein Kanal ist jetzt im Basisprofil",
      content: "Deine Inhalte bleiben gespeichert. Banner, Bio und Links sind weiterhin sichtbar. Reaktiviere dein Abo im Künstlerbereich, damit Titel und Videos sofort wieder erscheinen.",
      preview: "Du kannst jederzeit in deinen Account zurückkehren und das Abo reaktivieren.",
      idempotencyKey: `basic-profile-${subscription.id}`
    });
  }
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
      if (typeof session.subscription === "string") await setSubscription(await getStripe().subscriptions.retrieve(session.subscription));
    }
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") await setSubscription(event.data.object as Stripe.Subscription);
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
      if (subscriptionId) await admin.from("artist_profiles").update({ billing_status: "past_due" }).eq("stripe_subscription_id", subscriptionId);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook konnte nicht verarbeitet werden." }, { status: 400 });
  }
}
