"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import { LanguageSwitcher, useSiteLocale } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-footer";

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 32);
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Etwas ist schiefgelaufen. Bitte versuche es erneut.";
}

export default function HomePage() {
  const [artistName, setArtistName] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [winbackOptIn, setWinbackOptIn] = useState(true);
  const locale = useSiteLocale();
  const english = locale === "en";
  const slug = useMemo(() => normalizeSlug(slugInput || artistName), [artistName, slugInput]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    getSupabase().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!slug || slug.length < 3) {
      setStatus(english ? "Please choose a name with at least 3 characters." : "Bitte wähle einen Namen mit mindestens 3 Zeichen.");
      return;
    }
    if (!email) {
      window.location.href = "/auth?next=/";
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabase();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Bitte melde dich erneut an.");

      const { data: existingProfile, error: existingProfileError } = await supabase
        .from("artist_profiles")
        .select("id,billing_status")
        .eq("user_id", userData.user.id)
        .eq("slug", slug)
        .maybeSingle();
      if (existingProfileError) throw new Error(existingProfileError.message);
      if (existingProfile) {
        if (["trialing", "active", "past_due"].includes(existingProfile.billing_status)) {
          window.location.assign("/account");
          return;
        }
        window.location.assign("/account");
        return;
      }

      const { data: available, error: availabilityError } = await supabase.rpc("is_subdomain_available", { requested_slug: slug });
      if (availabilityError) throw new Error(availabilityError.message);
      if (!available) {
        setStatus(english ? "This name is already taken." : "Dieser Name ist leider schon vergeben.");
        return;
      }

      const { data: reservation, error: reservationError } = await supabase
        .from("subdomain_reservations")
        .insert({ slug, user_id: userData.user.id, status: "pending" })
        .select("id")
        .single();
      if (reservationError) throw reservationError;

      const trialStartedAt = new Date();
      const trialEndsAt = new Date(trialStartedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { data: profile, error: profileError } = await supabase.from("artist_profiles").insert({
        user_id: userData.user.id,
        reservation_id: reservation.id,
        slug,
        artist_name: artistName || slug,
        is_published: false,
        billing_status: "trialing",
        channel_mode: "full",
        trial_started_at: trialStartedAt.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        winback_opt_in: winbackOptIn
      }).select("id").single();
      if (profileError) throw profileError;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        await fetch("/api/notifications/registration", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session?.access_token ?? ""}` },
          body: JSON.stringify({ profileId: profile.id })
        });
      } catch (notificationError) {
        console.warn("[reservation] admin notification failed", notificationError);
      }
      window.location.assign("/account");
    } catch (error) {
      console.error("[reservation] failed", error);
      setStatus(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link>
        <div className="navlinks">
          <a href="#so-gehts">{english ? "How it works" : "So geht's"}</a>
          <a href="https://voitto-tai-kooma.aimusicrebels.com">{english ? "Example profile" : "Beispielprofil"}</a>
          <Link href={email ? "/account" : "/auth"}>{email ? "Account" : english ? "Sign in" : "Anmelden"}</Link>
          <LanguageSwitcher />
        </div>
      </nav>

      <section className="hero">
        <div>
          <div className="eyebrow">{english ? "AI Music · Your rebel stage" : "AI Music · Deine Bühne für die Rebellion"}</div>
          <h1 className="hero-title">{(english ? ["Break the rules.", "Claim your sound.", "Join the rebellion."] : ["Spreng die Regeln.", "Zeig deinen Sound.", "Werde Teil der Rebellion."]).map((line) => <span key={line} style={{ display: "block", whiteSpace: "nowrap" }}>{line}</span>)}</h1>
          <p className="lead">{english ? "No boxes. No gatekeepers. Claim your own artist page, build your identity and put your music where people can find it." : "Keine Schubladen. Keine Gatekeeper. Sichere dir deine eigene Künstlerseite, bau deine Identität auf und zeig der Welt deine Musik."}</p>
          <div id="so-gehts" className="steps"><span>{english ? "01 Claim your name" : "01 Namen sichern"}</span><span>{english ? "02 Build your profile" : "02 Profil aufbauen"}</span><span>{english ? "03 Drop your music" : "03 Musik raushauen"}</span></div>
        </div>

        <aside className="card">
          <h2>{english ? "Your subdomain" : "Deine Subdomain"}</h2>
          <p>{english ? "Claim your subdomain permanently for free. Start with a 30-day premium profile, then keep a free profile. Premium is always optional at €9.99 per year." : "Sichere dir deine Subdomain dauerhaft kostenlos. Starte mit einem 30-tägigen Premiumprofil und behalte danach dein Free-Profil. Premium ist jederzeit optional für 9,99 € pro Jahr."}</p>
          <form className="form" onSubmit={reserve}>
            <div>
              <label htmlFor="artistName">{english ? "Artist name" : "Künstlername"}</label>
              <input id="artistName" value={artistName} onChange={(event) => setArtistName(event.target.value)} placeholder={english ? "e.g. Lunar Vein" : "z. B. Lunar Vein"} />
            </div>
            <div>
              <label htmlFor="slug">{english ? "Your address" : "Deine Adresse"}</label>
              <input id="slug" value={slugInput} onChange={(event) => setSlugInput(event.target.value)} placeholder={slug || "lunar-vein"} />
              <p className="note">{slug ? `${slug}.aimusicrebels.com` : english ? "Created from your artist name" : "Wird aus deinem Künstlernamen erstellt"}</p>
            </div>
            <label className="consent"><input type="checkbox" checked={winbackOptIn} onChange={(event) => setWinbackOptIn(event.target.checked)} /> {english ? "After an expired subscription, send me at most one reactivation reminder per month." : "Ich möchte nach einem abgelaufenen Abo maximal monatlich eine Erinnerung zur Reaktivierung erhalten."}</label>
            <button disabled={busy}>{busy ? (english ? "Creating your profile …" : "Profil wird erstellt …") : email ? (english ? "Claim free subdomain" : "Kostenlose Subdomain sichern") : (english ? "Sign in & claim" : "Anmelden & sichern")}</button>
            {status && <p className={status.startsWith("Reserviert") ? "note success" : "note error"}>{status}</p>}
          </form>
        </aside>
      </section>
      <SiteFooter />
    </main>
  );
}
