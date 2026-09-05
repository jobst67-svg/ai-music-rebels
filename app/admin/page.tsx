"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { LanguageSwitcher, useSiteLocale } from "@/components/language-switcher";

type Profile = {
  id: string; slug: string; artist_name: string | null; tagline: string | null; genre_primary: string | null; genre_secondary: string | null; bio: string | null;
  image_path: string | null; banner_path: string | null; accent_color: string | null;
  spotify_url: string | null; youtube_url: string | null; suno_url: string | null; tiktok_url: string | null; facebook_url: string | null;
  music_platforms: string[] | null; billing_status: string; channel_mode: string; stripe_customer_id: string | null;
  stripe_subscription_id: string | null; trial_started_at: string | null; trial_ends_at: string | null;
  winback_opt_in: boolean; created_at: string; is_published: boolean; moderation_status: string; moderation_note: string | null; moderation_updated_at: string | null;
};
type Warning = { message: string; created_at: string };
type AdminUser = { id: string; email: string; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null; banned_until: string | null; profile: Profile | null; warning_count: number; latest_warning: Warning | null };
type Action = "approve" | "unpublish" | "ban" | "unban" | "kick" | "warn" | "cancel_subscription";

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

  async function action(user: AdminUser, kind: Action) {
    let message: string | null = null;
    if (kind === "warn") {
      message = window.prompt(english ? `Warning for ${user.email}. Enter the reason:` : `Verwarnung für ${user.email}. Grund eingeben:`);
      if (!message?.trim()) return;
    }
    const confirmText = kind === "approve"
      ? (english ? `Publish ${user.email}'s profile?` : `Profil von ${user.email} freischalten?`)
      : kind === "unpublish"
        ? (english ? `Hide ${user.email}'s public profile?` : `Öffentliches Profil von ${user.email} ausblenden?`)
        : kind === "kick"
          ? (english ? `Permanently remove ${user.email} from Rebels? Their data will be retained but access will be blocked.` : `${user.email} dauerhaft aus Rebels entfernen? Die Daten bleiben erhalten, der Zugang wird gesperrt.`)
          : kind === "ban"
            ? (english ? `Block ${user.email}? Their public profile will be hidden.` : `${user.email} sperren? Das öffentliche Profil wird ausgeblendet.`)
            : kind === "cancel_subscription"
              ? (english ? `Cancel the Stripe subscription for ${user.email} immediately?` : `Stripe-Abo von ${user.email} sofort kündigen?`)
              : (english ? `Unblock ${user.email}?` : `${user.email} entsperren?`);
    if (!window.confirm(confirmText)) return;
    setBusyId(user.id);
    setStatus("");
    try {
      const response = await adminRequest("PATCH", { action: kind, userId: user.id, ...(message ? { message: message.trim() } : {}) });
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

  function moderationLabel(status: string) {
    const labels: Record<string, string> = english ? { approved: "Published", suspended: "Suspended", kicked: "Kicked", pending: "Pending" } : { approved: "Freigeschaltet", suspended: "Gesperrt", kicked: "Gekickt", pending: "Ausstehend" };
    return labels[status] ?? status;
  }

  return <main className="shell page admin-page">
    <nav className="nav"><Link className="brand" href="/">AI MUSIC <em>REBELS</em></Link><div className="navlinks"><Link href="/account">Account</Link><LanguageSwitcher /></div></nav>
    <div className="eyebrow">Administration</div>
    <h1>{english ? "Manage users." : "Nutzer verwalten."}</h1>
    <p className="lead">{english ? "Full moderation access: publish, hide, suspend, warn and permanently remove Rebels." : "Vollständige Moderation: Profile freischalten, ausblenden, sperren, verwarnen und Rebels dauerhaft entfernen."}</p>
    {status && <p className="note admin-status">{status}</p>}
    <section className="admin-list">
      {users.map((user) => {
        const isBanned = Boolean(user.banned_until && user.banned_until !== "none" && new Date(user.banned_until).getTime() > Date.now());
        const profile = user.profile;
        const busy = busyId === user.id;
        return <article className="card admin-user" key={user.id}>
          <div className="admin-user-head">
            <div><h2>{user.email || "Ohne E-Mail"}</h2><p>{profile ? moderationLabel(profile.moderation_status) : isBanned ? (english ? "Blocked" : "Gesperrt") : user.email_confirmed_at ? (english ? "Email confirmed" : "E-Mail bestätigt") : (english ? "Email not confirmed" : "E-Mail nicht bestätigt")}</p></div>
            <div className="admin-actions">
              {profile && !isBanned && !profile.is_published && profile.moderation_status !== "kicked" && <button disabled={busy} onClick={() => void action(user, "approve")}>{busy ? "…" : english ? "Publish profile" : "Profil freischalten"}</button>}
              {profile?.is_published && <button className="secondary" disabled={busy} onClick={() => void action(user, "unpublish")}>{busy ? "…" : english ? "Hide profile" : "Profil ausblenden"}</button>}
              <button className="secondary" disabled={busy} onClick={() => void action(user, isBanned ? "unban" : "ban")}>{busy ? "…" : isBanned ? (english ? "Unblock" : "Entsperren") : (english ? "Suspend" : "Sperren")}</button>
              <button className="secondary" disabled={busy} onClick={() => void action(user, "warn")}>{busy ? "…" : english ? "Warn" : "Verwarnen"}{user.warning_count > 0 ? ` (${user.warning_count})` : ""}</button>
              <button className="danger" disabled={busy} onClick={() => void action(user, "kick")}>{busy ? "…" : english ? "Kick permanently" : "Dauerhaft kicken"}</button>
              <button className="danger" disabled={busy || !profile?.stripe_subscription_id} onClick={() => void action(user, "cancel_subscription")}>{english ? "Cancel subscription" : "Abo kündigen"}</button>
            </div>
          </div>
          <div className="admin-meta"><span>ID: {user.id}</span><span>{english ? "Created" : "Erstellt"}: {formatDate(user.created_at)}</span><span>{english ? "Last sign-in" : "Letzter Login"}: {formatDate(user.last_sign_in_at)}</span>{isBanned && <span>{english ? "Blocked until" : "Gesperrt bis"}: {formatDate(user.banned_until)}</span>}{user.warning_count > 0 && <span>{english ? "Warnings" : "Verwarnungen"}: {user.warning_count}</span>}</div>
          {profile ? <details className="admin-details"><summary>{english ? "Profile and billing data" : "Profil- und Abodaten"} · {profile.slug}.aimusicrebels.com</summary><div className="admin-profile-grid">
            <p><b>{english ? "Artist" : "Künstler"}</b>{profile.artist_name || "—"}</p><p><b>Status</b>{profile.billing_status} / {profile.channel_mode}</p><p><b>{english ? "Published" : "Öffentlich"}</b>{profile.is_published ? (english ? "Yes" : "Ja") : (english ? "No" : "Nein")}</p><p><b>{english ? "Moderation" : "Moderation"}</b>{moderationLabel(profile.moderation_status)}</p><p><b>{english ? "Genres" : "Genres"}</b>{[profile.genre_primary, profile.genre_secondary].filter(Boolean).join(" · ") || "—"}</p><p><b>{english ? "Platforms" : "Plattformen"}</b>{profile.music_platforms?.join(", ") || "—"}</p>
            <p><b>Stripe customer</b>{profile.stripe_customer_id || "—"}</p><p><b>Stripe subscription</b>{profile.stripe_subscription_id || "—"}</p><p><b>{english ? "Trial ends" : "Testmonat endet"}</b>{formatDate(profile.trial_ends_at)}</p><p><b>{english ? "Win-back email" : "Reaktivierungs-Mail"}</b>{profile.winback_opt_in ? (english ? "Allowed" : "Erlaubt") : (english ? "Not allowed" : "Nicht erlaubt")}</p>
            <p className="admin-wide"><b>Bio</b>{profile.bio || "—"}</p><p className="admin-wide"><b>{english ? "Links" : "Links"}</b>{[profile.spotify_url, profile.youtube_url, profile.suno_url, profile.tiktok_url, profile.facebook_url].filter(Boolean).join(" · ") || "—"}</p>{profile.moderation_note && <p className="admin-wide"><b>{english ? "Moderation note" : "Moderationsnotiz"}</b>{profile.moderation_note}</p>}{user.latest_warning && <p className="admin-wide"><b>{english ? "Latest warning" : "Letzte Verwarnung"}</b>{user.latest_warning.message} · {formatDate(user.latest_warning.created_at)}</p>}
          </div></details> : <p className="note">{english ? "No artist profile or subscription yet." : "Noch kein Künstlerprofil bzw. kein Abo vorhanden."}</p>}
        </article>;
      })}
    </section>
  </main>;
}
