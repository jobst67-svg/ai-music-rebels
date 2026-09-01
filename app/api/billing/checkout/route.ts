import { NextResponse } from "next/server";
import { getBillingAdmin, getRequestUser, type BillingProfile } from "@/lib/billing";
import { getStripe, getStripePriceId } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user?.email) return NextResponse.json({ error: "Bitte melde dich erneut an." }, { status: 401 });
    const { profileId } = await request.json() as { profileId?: string };
    if (!profileId) return NextResponse.json({ error: "Profil fehlt." }, { status: 400 });

    const admin = getBillingAdmin();
    const { data: profile, error } = await admin.from("artist_profiles").select("id,user_id,slug,artist_name,stripe_customer_id,stripe_subscription_id,trial_started_at").eq("id", profileId).eq("user_id", user.id).maybeSingle<BillingProfile>();
    if (error || !profile) return NextResponse.json({ error: "Profil wurde nicht gefunden." }, { status: 404 });

    const stripe = getStripe();
    const trialEligible = !profile.trial_started_at;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: profile.stripe_customer_id ?? undefined,
      customer_email: profile.stripe_customer_id ? undefined : user.email,
      client_reference_id: profile.id,
      payment_method_collection: "always",
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      subscription_data: {
        ...(trialEligible ? { trial_period_days: 30 } : {}),
        metadata: { artist_profile_id: profile.id, user_id: user.id }
      },
      metadata: { artist_profile_id: profile.id, user_id: user.id },
      success_url: `${new URL(request.url).origin}/account?checkout=success`,
      cancel_url: `${new URL(request.url).origin}/account?checkout=cancelled`
    });
    if (!session.url) throw new Error("Stripe konnte keine Zahlungsseite erzeugen.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Zahlung konnte nicht gestartet werden." }, { status: 500 });
  }
}
