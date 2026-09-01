import { NextResponse } from "next/server";
import { getBillingAdmin, getRequestUser } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Bitte melde dich erneut an." }, { status: 401 });
    const { profileId } = await request.json() as { profileId?: string };
    const { data: profile } = await getBillingAdmin().from("artist_profiles").select("stripe_customer_id").eq("id", profileId).eq("user_id", user.id).maybeSingle();
    if (!profile?.stripe_customer_id) return NextResponse.json({ error: "Für dieses Profil gibt es noch kein verwaltbares Abo." }, { status: 400 });
    const session = await getStripe().billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: `${new URL(request.url).origin}/account` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Aboverwaltung konnte nicht geöffnet werden." }, { status: 500 });
  }
}
