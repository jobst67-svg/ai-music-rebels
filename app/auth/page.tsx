"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";

const publicAuthUrl = "https://ai-music-rebels.vercel.app/auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function redirectUrl() {
    const next = new URLSearchParams(window.location.search).get("next") || "/";
    return `${publicAuthUrl}?next=${encodeURIComponent(next)}`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!hasSupabaseConfig) throw new Error("Die Anmeldung wird gerade eingerichtet.");
      const supabase = getSupabase();
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl() }
        });
        if (error) throw error;
        setMessage("Bitte bestätige jetzt deine E-Mail-Adresse. Danach kannst du deine Adresse reservieren.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = next;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!email) {
      setMessage("Trage zuerst deine E-Mail-Adresse ein.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectUrl() }
      });
      if (error) throw error;
      setMessage("Neue Bestätigungs-E-Mail wurde gesendet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Die E-Mail konnte nicht erneut gesendet werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell auth">
      <Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link>
      <section className="card">
        <h2>{mode === "signup" ? "Werde ein Rebel." : "Willkommen zurück."}</h2>
        <p>Ein Account für deine Subdomain und dein öffentliches Künstlerprofil.</p>
        <div className="switch">
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Registrieren</button>
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Anmelden</button>
        </div>
        <form className="form" onSubmit={submit}>
          <div><label htmlFor="email">E-Mail</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <div><label htmlFor="password">Passwort</label><input id="password" type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <button disabled={busy}>{busy ? "Bitte warten …" : mode === "signup" ? "Account anlegen" : "Anmelden"}</button>
          {mode === "signup" && <button type="button" className="secondary" disabled={busy} onClick={resendConfirmation}>Bestätigungsmail erneut senden</button>}
          {message && <p className="note">{message}</p>}
        </form>
      </section>
    </main>
  );
}
