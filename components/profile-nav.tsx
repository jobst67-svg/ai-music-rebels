"use client";

import Link from "next/link";
import { LanguageSwitcher, useSiteLocale } from "@/components/language-switcher";

type NavVariant = "home" | "standard" | "profile" | "account";

export function ProfileNav({
  variant = "profile",
  email = null,
  isAdmin = false,
  onSignOut,
  accountHref,
  accountLabel
}: {
  variant?: NavVariant;
  email?: string | null;
  isAdmin?: boolean;
  onSignOut?: () => void;
  accountHref?: string;
  accountLabel?: string;
}) {
  const locale = useSiteLocale();
  const english = locale === "en";
  const resolvedAccountHref = accountHref || (email ? "/account" : "/login?next=/claim-subdomain");
  const resolvedAccountLabel = accountLabel || (email ? "Account" : english ? "Sign in" : "Anmelden");
  const isProfile = variant === "profile";
  const isAccount = variant === "account";
  const isHome = variant === "home";

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    if (document.referrer) {
      window.location.assign(document.referrer);
      return;
    }
    window.location.assign("/");
  }

  return <nav className={`nav profile-nav ${isProfile ? "profile-nav-context" : ""}`}>
    <Link className="profile-brand" href="/" aria-label="AI Music Rebels Startseite">
      <img src="/ai-music-rebels-logo.webp" alt="AI Music Rebels" />
    </Link>
    {isProfile ? <div className="profile-nav-actions">
      <button type="button" className="profile-nav-button" onClick={goBack}>← {english ? "Back" : "Zurück"}</button>
      <Link className="profile-nav-button" href="/">{english ? "Home" : "Startseite"}</Link>
      <Link className="profile-nav-link" href="/example-profile">{english ? "Example profile" : "Beispielprofil"}</Link>
      <Link className="profile-nav-button" href={resolvedAccountHref}>{accountLabel || (english ? "Account" : "Account")}</Link>
      <LanguageSwitcher />
    </div> : <div className="profile-nav-actions">
      <Link className={isHome ? "profile-nav-link active" : "profile-nav-link"} href="/">{english ? "Home" : "Home"}</Link>
      <Link className="profile-nav-link" href="/#rebels">{english ? "Discover" : "Entdecken"}</Link>
      <Link className="profile-nav-link" href="/example-profile">{english ? "Example profile" : "Beispielprofil"}</Link>
      {isAccount && email && <span className="profile-nav-email">{email}</span>}
      {isAdmin && <Link className="profile-nav-link" href="/admin">Admin</Link>}
      <Link className="profile-nav-link" href={resolvedAccountHref}>{resolvedAccountLabel}</Link>
      {isAccount && onSignOut && <button type="button" className="profile-nav-link profile-nav-logout" onClick={onSignOut}>{english ? "Sign out" : "Abmelden"}</button>}
      {!isAccount && !email && <Link className="profile-nav-join" href="/register?next=/claim-subdomain">{english ? "Join Now" : "Jetzt mitmachen"}</Link>}
      <LanguageSwitcher />
    </div>}
  </nav>;
}
