"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSiteLocale } from "@/components/language-switcher";
import { ProfileNav } from "@/components/profile-nav";

type Profile = {
  id: string; slug: string; artist_name: string | null; tagline: string | null; genre_primary: string | null; genre_secondary: string | null; bio: string | null;
  image_path: string | null; banner_path: string | null; accent_color: string | null;
  spotify_url: string | null; youtube_url: string | null; suno_url: string | null; tiktok_url: string | null; facebook_url: string | null;
  music_platforms: string[] | null; billing_status: string; channel_mode: string; stripe_customer_id: string | null;
  stripe_subscription_id: string | null; trial_started_at: string | null; trial_ends_at: string | null;
  winback_opt_in: boolean; created_at: string; is_published: boolean; moderation_status: string; moderation_note: string | null; moderation_updated_at: string | null;
};
type DemoProfile = {
  id:string; slug:string; artist_name:string; tagline:string; genre_primary:string|null; genre_secondary:string|null; bio:string;
  image_path:string|null; banner_path:string|null; accent_color:string; spotify_url:string|null; youtube_url:string|null; suno_url:string|null; tiktok_url:string|null; facebook_url:string|null; is_published:boolean; updated_at:string;
};
type Warning = { message: string; created_at: string };
type AdminUser = { id: string; email: string; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null; banned_until: string | null; profile: Profile | null; warning_count: number; latest_warning: Warning | null };
type Action = "approve" | "unpublish" | "ban" | "unban" | "kick" | "warn" | "cancel_subscription";
type MailLanguage = "de" | "en";

function defaultMailSubject(english: boolean) {
  return english ? "Claim your free artist profile on AI Music Rebels" : "Sichere dir dein kostenloses Künstlerprofil bei AI Music Rebels";
}

function defaultMailHtml(english: boolean) {
  return english ? `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#061014;color:#f7f8f6;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:36px 24px;background:#061014;">
      <p style="margin:0 0 28px;"><img src="https://aimusicrebels.com/ai-music-rebels-logo.webp" alt="AI Music Rebels" style="width:220px;max-width:100%;height:auto;"></p>
      <h1 style="margin:0 0 18px;font-size:32px;line-height:1.1;color:#f7f8f6;">Your music. Your profile. Your rules.</h1>
      <p style="font-size:17px;line-height:1.6;color:#d6dfdc;">Hey, I came across your music and wanted to invite you to AI Music Rebels.</p>
      <p style="font-size:17px;line-height:1.6;color:#d6dfdc;">You can claim your own free artist profile with a permanent subdomain and collect all your links, music and videos in one place.</p>
      <p style="margin:28px 0;"><a href="https://aimusicrebels.com/register?next=/claim-subdomain" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#c8ff00;color:#07100b;text-decoration:none;font-weight:800;">Claim your free subdomain</a></p>
      <p style="font-size:14px;line-height:1.6;color:#aab8b3;">Free to start. No obligation. Premium is optional.</p>
      <p style="margin-top:32px;font-size:14px;line-height:1.6;color:#aab8b3;">Best,<br>AI Music Rebels</p>
    </div>
  </body>
</html>` : `<!doctype html>
<html lang="de">
  <body style="margin:0;background:#061014;color:#f7f8f6;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:36px 24px;background:#061014;">
      <p style="margin:0 0 28px;"><img src="https://aimusicrebels.com/ai-music-rebels-logo.webp" alt="AI Music Rebels" style="width:220px;max-width:100%;height:auto;"></p>
      <h1 style="margin:0 0 18px;font-size:32px;line-height:1.1;color:#f7f8f6;">Deine Musik. Dein Profil. Deine Regeln.</h1>
      <p style="font-size:17px;line-height:1.6;color:#d6dfdc;">Hey, ich bin auf deine Musik aufmerksam geworden und möchte dich zu AI Music Rebels einladen.</p>
      <p style="font-size:17px;line-height:1.6;color:#d6dfdc;">Du kannst dir ein kostenloses Künstlerprofil mit dauerhafter Subdomain sichern und deine Links, Musik und Videos an einem Ort sammeln.</p>
      <p style="margin:28px 0;"><a href="https://aimusicrebels.com/register?next=/claim-subdomain" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#c8ff00;color:#07100b;text-decoration:none;font-weight:800;">Kostenlose Subdomain sichern</a></p>
      <p style="font-size:14px;line-height:1.6;color:#aab8b3;">Kostenlos starten. Unverbindlich. Premium ist optional.</p>
      <p style="margin-top:32px;font-size:14px;line-height:1.6;color:#aab8b3;">Viele Grüße<br>AI Music Rebels</p>
    </div>
  </body>
</html>`;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export default function AdminPage() {
  const locale = useSiteLocale();
  const english = locale === "en";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [demos, setDemos] = useState<DemoProfile[]>([]);
  const [status, setStatus] = useState(english ? "Loading …" : "Wird geladen …");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mailTo, setMailTo] = useState("");
  const [mailLanguage, setMailLanguage] = useState<MailLanguage>(english ? "en" : "de");
  const [mailSubject, setMailSubject] = useState(defaultMailSubject(english));
  const [mailHtml, setMailHtml] = useState(() => defaultMailHtml(english));
  const [mailBusy, setMailBusy] = useState(false);
  const [mailStatus, setMailStatus] = useState("");

  async function authHeaders() {
    const { data } = await getSupabase().auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` };
  }

  async function adminRequest(method: "GET" | "PATCH", body?: object) {
    return fetch("/api/admin/users", { method, headers: await authHeaders(), body: body ? JSON.stringify(body) : undefined });
  }

  async function demoRequest(method: "GET" | "PATCH" | "POST", body?: object) {
    return fetch("/api/admin/demo-profiles", { method, headers: await authHeaders(), body: body ? JSON.stringify(body) : undefined });
  }

  async function sendMail() {
    if (!mailTo.trim()) { setMailStatus(english ? "Enter a recipient email address first." : "Bitte zuerst eine Empfänger-E-Mail-Adresse eingeben."); return; }
    setMailBusy(true); setMailStatus("");
    try {
      const response = await fetch("/api/admin/send-email", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ to: mailTo, subject: mailSubject, html: mailHtml }) });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || (english ? "Email could not be sent." : "E-Mail konnte nicht gesendet werden."));
      setMailStatus(result.message || (english ? "Email sent." : "E-Mail wurde gesendet."));
    } catch (error) { setMailStatus(error instanceof Error ? error.message : (english ? "Email could not be sent." : "E-Mail konnte nicht gesendet werden.")); }
    finally { setMailBusy(false); }
  }

  function selectMailLanguage(language: MailLanguage) {
    const nextEnglish = language === "en";
    setMailLanguage(language);
    setMailSubject(defaultMailSubject(nextEnglish));
    setMailHtml(defaultMailHtml(nextEnglish));
    setMailStatus("");
  }

  async function load() {
    setStatus(english ? "Loading …" : "Wird geladen …");
    const [userResponse, demoResponse] = await Promise.all([adminRequest("GET"), demoRequest("GET")]);
    const userResult = await userResponse.json() as { users?: AdminUser[]; error?: string };
    const demoResult = await demoResponse.json() as { profiles?: DemoProfile[]; error?: string };
    if (!userResponse.ok || !demoResponse.ok) {
      setStatus(userResult.error || demoResult.error || (english ? "No access to the admin area." : "Kein Zugriff auf den Adminbereich."));
      return;
    }
    setUsers(userResult.users ?? []);
    setDemos(demoResult.profiles ?? []);
    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  function updateDemo(id:string, key:keyof DemoProfile, value:unknown) {
    setDemos((current) => current.map((profile) => profile.id === id ? { ...profile, [key]: value } as DemoProfile : profile));
  }

  async function saveDemo(profile: DemoProfile) {
    setBusyId(profile.id); setStatus("");
    try {
      const response = await demoRequest("PATCH", profile);
      const result = await response.json() as { profile?:DemoProfile; message?:string; error?:string };
      if (!response.ok) throw new Error(result.error || "Speichern fehlgeschlagen.");
      if (result.profile) setDemos((current) => current.map((item) => item.id === profile.id ? result.profile! : item));
      setStatus(result.message || "Demo-Profil gespeichert.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Speichern fehlgeschlagen."); }
    finally { setBusyId(null); }
  }

  async function uploadDemoImage(profile: DemoProfile, target:"profile"|"banner", event:ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setStatus("Das Bild darf maximal 5 MB groß sein."); return; }
    setBusyId(profile.id); setStatus("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden.")); reader.readAsDataURL(file);
      });
      const response = await demoRequest("POST", { id:profile.id, slug:profile.slug, target, dataUrl });
      const result = await response.json() as { profile?:DemoProfile; message?:string; error?:string };
      if (!response.ok) throw new Error(result.error || "Upload fehlgeschlagen.");
      if (result.profile) setDemos((current) => current.map((item) => item.id === profile.id ? result.profile! : item));
      setStatus(result.message || "Bild gespeichert.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Upload fehlgeschlagen."); }
    finally { setBusyId(null); }
  }

  async function action(user: AdminUser, kind: Action) {
    let message: string | null = null;
    if (kind === "warn") {
      message = window.prompt(english ? `Warning for ${user.email}. Enter the reason:` : `Verwarnung für ${user.email}. Grund eingeben:`);
      if (!message?.trim()) return;
    }
    const confirmText = kind === "approve" ? (english ? `Publish ${user.email}'s profile?` : `Profil von ${user.email} freischalten?`)
      : kind === "unpublish" ? (english ? `Hide ${user.email}'s public profile?` : `Öffentliches Profil von ${user.email} ausblenden?`)
      : kind === "kick" ? (english ? `Permanently remove ${user.email} from Rebels?` : `${user.email} dauerhaft aus Rebels entfernen?`)
      : kind === "ban" ? (english ? `Block ${user.email}?` : `${user.email} sperren?`)
      : kind === "cancel_subscription" ? (english ? `Cancel the Stripe subscription for ${user.email} immediately?` : `Stripe-Abo von ${user.email} sofort kündigen?`)
      : (english ? `Unblock ${user.email}?` : `${user.email} entsperren?`);
    if (!window.confirm(confirmText)) return;
    setBusyId(user.id); setStatus("");
    try {
      const response = await adminRequest("PATCH", { action: kind, userId: user.id, ...(message ? { message: message.trim() } : {}) });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || (english ? "Action failed." : "Aktion fehlgeschlagen."));
      setStatus(result.message ?? (english ? "Saved." : "Gespeichert."));
      await load();
    } catch (error) { setStatus(error instanceof Error ? error.message : (english ? "Action failed." : "Aktion fehlgeschlagen.")); }
    finally { setBusyId(null); }
  }

  function moderationLabel(value: string) {
    const labels: Record<string, string> = english ? { approved: "Published", suspended: "Suspended", kicked: "Kicked", pending: "Pending" } : { approved: "Freigeschaltet", suspended: "Gesperrt", kicked: "Gekickt", pending: "Ausstehend" };
    return labels[value] ?? value;
  }

  return <main className="shell page admin-page">
    <ProfileNav variant="standard" />
    <div className="eyebrow">Administration</div>
    <h1>{english ? "Manage Rebels." : "Rebels verwalten."}</h1>
    <p className="lead">{english ? "Edit demo artists and moderate registered users." : "Demo-Artists bearbeiten und registrierte Nutzer moderieren."}</p>
    {status && <p className="note admin-status">{status}</p>}

    <section className="card admin-mail">
      <div className="section-title"><div><div className="eyebrow">E-Mail</div><h2>{english ? "Send an invitation" : "Einladung senden"}</h2></div><span>{english ? "Admin only" : "Nur für Admins"}</span></div>
      <p>{english ? "Enter the address, adjust the subject or HTML if needed, and send the prepared message." : "E-Mail-Adresse eintragen, Betreff oder HTML bei Bedarf anpassen und die vorbereitete Nachricht senden."}</p>
      <div className="admin-mail-presets" role="tablist" aria-label={english ? "Email language" : "E-Mail-Sprache"}>
        <button type="button" className={`admin-mail-preset ${mailLanguage === "de" ? "active" : ""}`} aria-selected={mailLanguage === "de"} onClick={() => selectMailLanguage("de")}>Deutsch</button>
        <button type="button" className={`admin-mail-preset ${mailLanguage === "en" ? "active" : ""}`} aria-selected={mailLanguage === "en"} onClick={() => selectMailLanguage("en")}>English</button>
      </div>
      <div className="editgrid">
        <div className="wide"><label htmlFor="admin-mail-to">{english ? "Recipient email" : "Empfänger-E-Mail"}</label><input id="admin-mail-to" type="email" value={mailTo} onChange={(event) => setMailTo(event.target.value)} placeholder="name@example.com" /></div>
        <div className="wide"><label htmlFor="admin-mail-subject">{english ? "Subject" : "Betreff"}</label><input id="admin-mail-subject" value={mailSubject} onChange={(event) => setMailSubject(event.target.value)} /></div>
        <div className="wide"><label htmlFor="admin-mail-html">HTML</label><textarea id="admin-mail-html" className="admin-mail-html" rows={18} value={mailHtml} onChange={(event) => setMailHtml(event.target.value)} spellCheck={false} /></div>
      </div>
      <div className="admin-mail-actions"><button type="button" disabled={mailBusy} onClick={() => void sendMail()}>{mailBusy ? (english ? "Sending …" : "Wird gesendet …") : (english ? "Send email" : "E-Mail senden")}</button>{mailStatus && <span className="note">{mailStatus}</span>}</div>
      <details className="admin-details"><summary>{english ? "Preview" : "Vorschau"}</summary><iframe className="admin-mail-preview" title={english ? "Email preview" : "E-Mail-Vorschau"} srcDoc={mailHtml} sandbox="" /></details>
    </section>

    <section className="admin-list">
      <h2>{english ? "Demo profiles" : "Demo-Profile"}</h2>
      {demos.map((profile) => <article className="card admin-user" key={profile.id}>
        <div className="admin-user-head">
          <div><h2>{profile.artist_name}</h2><p>{profile.slug}.aimusicrebels.com · {profile.is_published ? (english ? "public" : "öffentlich") : (english ? "hidden" : "ausgeblendet")}</p></div>
          <div className="admin-actions"><a className="outline" href={`https://${profile.slug}.aimusicrebels.com`} target="_blank" rel="noreferrer">{english ? "Open profile" : "Profil öffnen"}</a><button disabled={busyId===profile.id} onClick={() => void saveDemo(profile)}>{busyId===profile.id ? "…" : english ? "Save" : "Speichern"}</button></div>
        </div>
        <div className="editgrid">
          <div><label>{english ? "Artist name" : "Künstlername"}</label><input value={profile.artist_name} onChange={(e)=>updateDemo(profile.id,"artist_name",e.target.value)} /></div>
          <div><label>Subdomain</label><input value={profile.slug} disabled /></div>
          <div><label>{english ? "Primary genre" : "Hauptgenre"}</label><input value={profile.genre_primary ?? ""} onChange={(e)=>updateDemo(profile.id,"genre_primary",e.target.value || null)} /></div>
          <div><label>{english ? "Secondary genre" : "Zweitgenre"}</label><input value={profile.genre_secondary ?? ""} onChange={(e)=>updateDemo(profile.id,"genre_secondary",e.target.value || null)} /></div>
          <div className="wide"><label>{english ? "Short text" : "Kurztext"}</label><input value={profile.tagline} onChange={(e)=>updateDemo(profile.id,"tagline",e.target.value)} /></div>
          <div className="wide"><label>Bio</label><textarea rows={4} value={profile.bio} onChange={(e)=>updateDemo(profile.id,"bio",e.target.value)} /></div>
          <div><label>Spotify</label><input value={profile.spotify_url ?? ""} onChange={(e)=>updateDemo(profile.id,"spotify_url",e.target.value || null)} /></div>
          <div><label>YouTube</label><input value={profile.youtube_url ?? ""} onChange={(e)=>updateDemo(profile.id,"youtube_url",e.target.value || null)} /></div>
          <div><label>Suno</label><input value={profile.suno_url ?? ""} onChange={(e)=>updateDemo(profile.id,"suno_url",e.target.value || null)} /></div>
          <div><label>TikTok</label><input value={profile.tiktok_url ?? ""} onChange={(e)=>updateDemo(profile.id,"tiktok_url",e.target.value || null)} /></div>
          <div><label>Facebook</label><input value={profile.facebook_url ?? ""} onChange={(e)=>updateDemo(profile.id,"facebook_url",e.target.value || null)} /></div>
          <div><label>{english ? "Accent color" : "Akzentfarbe"}</label><input type="color" value={profile.accent_color || "#c8ff00"} onChange={(e)=>updateDemo(profile.id,"accent_color",e.target.value)} /></div>
          <div className="wide"><label className="consent"><input type="checkbox" checked={profile.is_published} onChange={(e)=>updateDemo(profile.id,"is_published",e.target.checked)} />{english ? "Show profile publicly" : "Profil öffentlich anzeigen"}</label></div>
        </div>
        <div className="admin-actions" style={{marginTop:16}}>
          <label className="outline" style={{cursor:"pointer"}}>{english ? "Upload profile image" : "Profilbild hochladen"}<input className="fileinput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>void uploadDemoImage(profile,"profile",e)} /></label>
          <label className="outline" style={{cursor:"pointer"}}>{english ? "Upload banner" : "Banner hochladen"}<input className="fileinput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>void uploadDemoImage(profile,"banner",e)} /></label>
        </div>
      </article>)}
    </section>

    <section className="admin-list" style={{marginTop:40}}>
      <h2>{english ? "Registered users" : "Registrierte Nutzer"}</h2>
      {users.map((user) => {
        const isBanned = Boolean(user.banned_until && user.banned_until !== "none" && new Date(user.banned_until).getTime() > Date.now());
        const profile = user.profile; const busy = busyId === user.id;
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
            <p><b>{english ? "Artist" : "Künstler"}</b>{profile.artist_name || "—"}</p><p><b>Status</b>{profile.billing_status} / {profile.channel_mode}</p><p><b>{english ? "Published" : "Öffentlich"}</b>{profile.is_published ? (english ? "Yes" : "Ja") : (english ? "No" : "Nein")}</p><p><b>{english ? "Genres" : "Genres"}</b>{[profile.genre_primary, profile.genre_secondary].filter(Boolean).join(" · ") || "—"}</p>
            <p className="admin-wide"><b>Bio</b>{profile.bio || "—"}</p>{profile.moderation_note && <p className="admin-wide"><b>{english ? "Moderation note" : "Moderationsnotiz"}</b>{profile.moderation_note}</p>}{user.latest_warning && <p className="admin-wide"><b>{english ? "Latest warning" : "Letzte Verwarnung"}</b>{user.latest_warning.message} · {formatDate(user.latest_warning.created_at)}</p>}
          </div></details> : <p className="note">{english ? "No artist profile or subscription yet." : "Noch kein Künstlerprofil bzw. kein Abo vorhanden."}</p>}
        </article>;
      })}
    </section>
  </main>;
}
