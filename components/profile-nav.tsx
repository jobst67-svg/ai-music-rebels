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
  const isAccount = variant === "account";
  const resolvedAccountHref = accountHref || (email ? "/account" : "/login?next=/claim-subdomain");
  const resolvedAccountLabel = accountLabel || (email ? "Account" : english ? "Sign in" : "Anmelden");

  return <nav className={`nav profile-nav ${isAccount ? "profile-nav-account" : ""}`}>
    <Link className="profile-brand" href="/" aria-label="AI Music Rebels Startseite">
      <img src="/ai-music-rebels-logo.webp" alt="AI Music Rebels" />
    </Link>
    <div className="profile-nav-actions">
      <Link className="profile-nav-link active" href="/">{english ? "Home" : "Home"}</Link>
      <Link className="profile-nav-link" href="/#rebels">{english ? "Discover" : "Entdecken"}</Link>
      <Link className="profile-nav-link" href="/example-profile">{english ? "Example profile" : "Beispielprofil"}</Link>
      <Link className="profile-nav-link" href={resolvedAccountHref}>{resolvedAccountLabel}</Link>
      {isAdmin && <Link className="profile-nav-link" href="/admin">Admin</Link>}
      {isAccount && onSignOut && <button type="button" className="profile-nav-link profile-nav-logout" onClick={onSignOut}>{english ? "Sign out" : "Abmelden"}</button>}
      {!isAccount && !email && <Link className="profile-nav-join" href="/register?next=/claim-subdomain">{english ? "Join Now" : "Jetzt mitmachen"}</Link>}
      <LanguageSwitcher />
    </div>
  </nav>;
}
