"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { LanguageSwitcher, useSiteLocale } from "@/components/language-switcher";

type Profile = {
  id: string; slug: string; artist_name: string | null; tagline: string | null; bio: string | null;
  image_path: string | null; banner_path: string | null; accent_color: string | null;
  spotify_url: string | null; youtube_url: string | null; suno_url: string | null; tiktok_url: string | null; facebook_url: string | null;
  music_platforms: string[] | null; billing_status: string; channel_mode: string; stripe_customer_id: string | null;
  stripe_subscription_id: string | null; trial_started_at: string | null; trial_ends_at: string | null;
  winback_opt_in: boolean; created_at: string; is_published: boolean;
};
type AdminUser = { id: string; email: string; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null; banned_until: string | null; profile: Profile | null };

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export default function AdminPage() {
  const locale = useSiteLocale();
  const english = locale === "en";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState(english ? "Loading users …" : "Nutzer werden geladen …");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function adminRequest(method: "GET" | "PATCH", body?: object) {
    const { data } = await getSupabase().auth.getSession();
    return fetch("/api/admin/users", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async function load() {
    setStatus(english ? "Loading users …" : "Nutzer werden geladen …");
    const response = await adminRequest("GET");
    const result = await response.json() as { users?: AdminUser[]; error?: string };
    if (!response.ok) {
      setStatus(result.error ?? (english ? "No access to the admin area." : "Kein Zugriff auf den Adminbereich."));
      return;
    }
    setUsers(result.users ?? []);
    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  async function action(user: AdminUser, kind: "ban" | "unban" | "cancel_subscription") {
    const text = kind === "ban"
      ? (english ? `Block ${user.email}? Their public profile will be hidden.` : `${user.email} sperren? Das öffentliche Profil wird ausgeblendet.`)
      : kind === "cancel_subscription"
        ? (english ? `Cancel the Stripe subscription for ${user.email} immediately?` : `Stripe-Abo von ${user.email} sofort kündigen?`)
        : (english ? `Unblock ${user.email}?` : `${user.email} entsperren?`);
    if (!window.confirm(text)) return;
    setBusyId(user.id);
    setStatus("");
    try {
      const response = await adminRequest("PATCH", { action: kind, userId: user.id });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || (english ? "Action failed." : "Aktion fehlgeschlagen."));
      setStatus(result.message ?? (english ? "Saved." : "Gespeichert."));
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : (english ? "Action failed." : "Aktion fehlgeschlagen."));
    } finally {
      setBusyId(null);
    }
  }

  return <main className="shell page admin-page">
    <nav className="nav"><Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link><div className="navlinks"><Link href="/account">{english ? "Account" : "Account"}</Link><LanguageSwitcher /></div></nav>
    <div className="eyebrow">{english ? "Administration" : "Administration"}</div>
    <h1>{english ? "Manage users." : "Nutzer verwalten."}</h1>
    <p className="lead">{english ? "Restricted to jobst67@gmail.com. Account information, profiles and subscription state are shown here." : "Nur für jobst67@gmail.com. Hier siehst du Konto-, Profil- und Abodaten und kannst Zugänge verwalten."}</p>
    {status && <p className="note admin-status">{status}</p>}
    <section className="admin-list">
      {users.map((user) => {
        const isBanned = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now());
        const profile = user.profile;
        return <article className="card admin-user" key={user.id}>
          <div className="admin-user-head">
            <div><h2>{user.email || "Ohne E-Mail"}</h2><p>{isBanned ? (english ? "Blocked" : "Gesperrt") : user.email_confirmed_at ? (english ? "Email confirmed" : "E-Mail bestätigt") : (english ? "Email not confirmed" : "E-Mail nicht bestätigt")}</p></div>
            <div className="admin-actions">
              <button className="secondary" disabled={busyId === user.id} onClick={() => void action(user, isBanned ? "unban" : "ban")}>{busyId === user.id ? "…" : isBanned ? (english ? "Unblock" : "Entsperren") : (english ? "Block user" : "Sperren")}</button>
              <button className="danger" disabled={busyId === user.id || !profile?.stripe_subscription_id} onClick={() => void action(user, "cancel_subscription")}>{english ? "Cancel subscription" : "Abo kündigen"}</button>
            </div>
          </div>
          <div className="admin-meta"><span>ID: {user.id}</span><span>{english ? "Created" : "Erstellt"}: {formatDate(user.created_at)}</span><span>{english ? "Last sign-in" : "Letzter Login"}: {formatDate(user.last_sign_in_at)}</span>{isBanned && <span>{english ? "Blocked until" : "Gesperrt bis"}: {formatDate(user.banned_until)}</span>}</div>
          {profile ? <details className="admin-details"><summary>{english ? "Profile and billing data" : "Profil- und Abodaten"} · {profile.slug}.aimusicrebels.com</summary><div className="admin-profile-grid">
            <p><b>{english ? "Artist" : "Künstler"}</b>{profile.artist_name || "—"}</p><p><b>Status</b>{profile.billing_status} / {profile.channel_mode}</p><p><b>{english ? "Published" : "Öffentlich"}</b>{profile.is_published ? (english ? "Yes" : "Ja") : (english ? "No" : "Nein")}</p><p><b>{english ? "Platforms" : "Plattformen"}</b>{profile.music_platforms?.join(", ") || "—"}</p>
            <p><b>Stripe customer</b>{profile.stripe_customer_id || "—"}</p><p><b>Stripe subscription</b>{profile.stripe_subscription_id || "—"}</p><p><b>{english ? "Trial ends" : "Testmonat endet"}</b>{formatDate(profile.trial_ends_at)}</p><p><b>{english ? "Win-back email" : "Reaktivierungs-Mail"}</b>{profile.winback_opt_in ? (english ? "Allowed" : "Erlaubt") : (english ? "Not allowed" : "Nicht erlaubt")}</p>
            <p className="admin-wide"><b>Bio</b>{profile.bio || "—"}</p><p className="admin-wide"><b>{english ? "Links" : "Links"}</b>{[profile.spotify_url, profile.youtube_url, profile.suno_url, profile.tiktok_url, profile.facebook_url].filter(Boolean).join(" · ") || "—"}</p>
          </div></details> : <p className="note">{english ? "No artist profile or subscription yet." : "Noch kein Künstlerprofil bzw. kein Abo vorhanden."}</p>}
        </article>;
      })}
    </section>
  </main>;
}
