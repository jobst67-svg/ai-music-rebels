"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 32);
}

export default function HomePage() {
  const [artistName, setArtistName] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const slug = useMemo(() => normalizeSlug(slugInput || artistName), [artistName, slugInput]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    getSupabase().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!slug || slug.length < 3) {
      setStatus("Bitte wähle einen Namen mit mindestens 3 Zeichen.");
      return;
    }
    if (!email) {
      window.location.href = "/auth?next=/";
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabase();
      const { data: available, error: availabilityError } = await supabase.rpc("is_subdomain_available", { requested_slug: slug });
      if (availabilityError) throw availabilityError;
      if (!available) {
        setStatus("Dieser Name ist leider schon vergeben.");
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Bitte melde dich erneut an.");

      const { data: reservation, error: reservationError } = await supabase
        .from("subdomain_reservations")
        .insert({ slug, user_id: userData.user.id, status: "pending" })
        .select("id")
        .single();
      if (reservationError) throw reservationError;

      const { error: profileError } = await supabase.from("artist_profiles").insert({
        user_id: userData.user.id,
        reservation_id: reservation.id,
        slug,
        artist_name: artistName || slug,
        is_published: false
      });
      if (profileError) throw profileError;

      setStatus("Reserviert. Nach der Zahlung schaltest du dein öffentliches Profil frei.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link>
        <div className="navlinks">
          <a href="#so-gehts">So geht&apos;s</a>
          <Link href="/artist/lunar-vein">Beispielprofil</Link>
          <Link href="/auth">{email ? "Account" : "Anmelden"}</Link>
        </div>
      </nav>

      <section className="hero">
        <div>
          <div className="eyebrow">AI Music · Your artist identity</div>
          <h1>Mach aus deiner Idee einen Klang.</h1>
          <p className="lead">Deine eigene Künstlerseite für Musik, die mit neuen Werkzeugen entsteht. Mit Bild, Bio, eingebettetem Player und allen wichtigen Plattformen an einem Ort.</p>
          <div id="so-gehts" className="steps"><span>01 Namen sichern</span><span>02 Profil gestalten</span><span>03 Musik zeigen</span></div>
        </div>

        <aside className="card">
          <h2>Deine Subdomain</h2>
          <p>Für 9,99 € pro Jahr bekommst du deine persönliche Künstleradresse bei AI Music Rebels.</p>
          <form className="form" onSubmit={reserve}>
            <div>
              <label htmlFor="artistName">Künstlername</label>
              <input id="artistName" value={artistName} onChange={(event) => setArtistName(event.target.value)} placeholder="z. B. Lunar Vein" />
            </div>
            <div>
              <label htmlFor="slug">Deine Adresse</label>
              <input id="slug" value={slugInput} onChange={(event) => setSlugInput(event.target.value)} placeholder={slug || "lunar-vein"} />
              <p className="note">{slug ? `${slug}.aimusicrebels.com` : "Wird aus deinem Künstlernamen erstellt"}</p>
            </div>
            <button disabled={busy}>{busy ? "Wird reserviert …" : email ? "Adresse reservieren" : "Anmelden & reservieren"}</button>
            {status && <p className={status.startsWith("Reserviert") ? "note success" : "note error"}>{status}</p>}
          </form>
        </aside>
      </section>
    </main>
  );
}
