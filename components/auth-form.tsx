"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import { SiteFooter } from "@/components/site-footer";
import { ProfileNav } from "@/components/profile-nav";

type AuthMode = "login" | "register";

const publicSiteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://aimusicrebels.com").replace(/\/$/, "");

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/claim-subdomain";
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const registering = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextValue, setNextValue] = useState("/claim-subdomain");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const nextPath = () => safeNext(new URLSearchParams(window.location.search).get("next"));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextValue(safeNext(params.get("next")));
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      try {
        setMessage(decodeURIComponent(oauthError.replace(/\+/g, " ")));
      } catch {
        setMessage(oauthError);
      }
    }

    const supabase = getSupabase();
    const finish = () => window.location.replace(nextPath());
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) finish();
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) finish(); });
    return () => listener.subscription.unsubscribe();
  }, []);

  function redirectUrl() {
    const path = registering ? "/register" : "/login";
    return publicSiteUrl + path + "?next=" + encodeURIComponent(nextPath());
  }

  async function google() {
    setBusy(true);
    setMessage("");
    try {
      if (!hasSupabaseConfig) throw new Error("Die Google-Anmeldung ist noch nicht eingerichtet.");
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl(), queryParams: { access_type: "offline", prompt: "select_account" } }
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google-Anmeldung fehlgeschlagen.");
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!hasSupabaseConfig) throw new Error("Die Anmeldung wird gerade eingerichtet.");
      const supabase = getSupabase();
      if (registering) {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl() } });
        if (error) throw error;
        setMessage("Bitte bestätige deine E-Mail-Adresse. Danach geht es direkt zu deiner kostenlosen Subdomain.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = nextPath();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!email) {
      setMessage("Trage zuerst deine E-Mail-Adresse ein.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectUrl() } });
      if (error) throw error;
      setMessage("Neue Bestätigungs-E-Mail wurde gesendet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "E-Mail konnte nicht gesendet werden.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell auth">
    <ProfileNav variant="standard" />
    <section className="card">
      <h2>{registering ? "Join the rebellion." : "Willkommen zurück."}</h2>
      <p>{registering ? "Erstelle deinen kostenlosen Account und sichere dir deine eigene Subdomain." : "Melde dich an, um dein Künstlerprofil zu verwalten."}</p>
      <button type="button" onClick={google} disabled={busy} style={{ width: "100%", margin: "12px 0 18px" }}>G &nbsp; {registering ? "Mit Google registrieren" : "Mit Google anmelden"}</button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#777", fontSize: 12 }}><span style={{ height: 1, background: "#444", flex: 1 }} /><b>ODER</b><span style={{ height: 1, background: "#444", flex: 1 }} /></div>
      <form className="form" onSubmit={submit}>
        <div><label htmlFor="auth-email">E-Mail</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></div>
        <div><label htmlFor="auth-password">Passwort</label><input id="auth-password" type="password" minLength={8} autoComplete={registering ? "new-password" : "current-password"} required value={password} onChange={event => setPassword(event.target.value)} /></div>
        <button disabled={busy}>{busy ? "Bitte warten …" : registering ? "Account anlegen" : "Anmelden"}</button>
        {registering && <button type="button" className="secondary" disabled={busy} onClick={resend}>Bestätigungsmail erneut senden</button>}
        {message && <p className="note">{message}</p>}
      </form>
      <p className="note auth-mode-links">
        {registering ? <>Du hast bereits einen Account? <Link href={"/login?next=" + encodeURIComponent(nextValue)}>Anmelden</Link></> : <>Noch kein Account? <Link href={"/register?next=" + encodeURIComponent(nextValue)}>Registrieren</Link></>}
      </p>
    </section>
    <SiteFooter />
  </main>;
}
