import { NextResponse } from "next/server";
import { getBillingAdmin } from "@/lib/billing";
import { sendBillingEmail } from "@/lib/resend";

function authorized(request: Request) {
  return Boolean(process.env.CRON_SECRET) && request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getBillingAdmin();
  const now = new Date();
  const { data: expiredTrials } = await admin.from("artist_profiles").select("id").eq("billing_status", "trialing").lt("trial_ends_at", now.toISOString()).limit(100);
  if (expiredTrials && expiredTrials.length > 0) {
    await admin.from("artist_profiles").update({ billing_status: "basic", channel_mode: "basic" }).in("id", expiredTrials.map((profile) => profile.id));
  }
  const inEightDays = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: trials, error } = await admin.from("artist_profiles").select("id,user_id,artist_name,trial_ends_at").eq("billing_status", "trialing").is("trial_reminder_sent_at", null).gte("trial_ends_at", inSevenDays).lte("trial_ends_at", inEightDays).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let trialReminders = 0;
  for (const profile of trials ?? []) {
    const { data: auth } = await admin.auth.admin.getUserById(profile.user_id);
    if (!auth.user?.email) continue;
    await sendBillingEmail({ to: auth.user.email, subject: "Dein kostenloser Monat endet in einer Woche", content: `Dein Künstlerkanal ${profile.artist_name || ""} bleibt ohne Unterbrechung im Vollzugriff, wenn die hinterlegte Zahlungsart belastet werden kann.`, preview: "Verwalte dein Abo jederzeit im Künstlerbereich.", idempotencyKey: `trial-reminder-${profile.id}` });
    await admin.from("artist_profiles").update({ trial_reminder_sent_at: now.toISOString() }).eq("id", profile.id);
    trialReminders += 1;
  }
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: winbacks } = await admin.from("artist_profiles").select("id,user_id,artist_name").eq("channel_mode", "basic").eq("winback_opt_in", true).or(`winback_last_sent_at.is.null,winback_last_sent_at.lte.${monthAgo}`).limit(100);
  let winbackReminders = 0;
  for (const profile of winbacks ?? []) {
    const { data: auth } = await admin.auth.admin.getUserById(profile.user_id);
    if (!auth.user?.email) continue;
    await sendBillingEmail({ to: auth.user.email, subject: "Dein Künstlerkanal wartet auf dich", content: `Dein Profil ${profile.artist_name || ""} ist weiter gespeichert. Mit einer Reaktivierung werden deine Titel und Videos wieder sofort angezeigt.`, preview: "Diese Erinnerung kannst du im Künstlerbereich jederzeit abbestellen.", idempotencyKey: `winback-${profile.id}-${now.toISOString().slice(0, 7)}` });
    await admin.from("artist_profiles").update({ winback_last_sent_at: now.toISOString() }).eq("id", profile.id);
    winbackReminders += 1;
  }
  return NextResponse.json({ ok: true, trialReminders, winbackReminders });
}
