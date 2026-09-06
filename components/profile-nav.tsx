"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher, useSiteLocale } from "@/components/language-switcher";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import styles from "./profile-nav.module.css";

type NavVariant = "home" | "standard" | "profile" | "account";
const sharedAuthCookie = "aimr_auth_email";
const mainSite = "https://aimusicrebels.com";

function readSharedAuthEmail() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${sharedAuthCookie}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeSharedAuthEmail(email: string) {
  document.cookie = `${sharedAuthCookie}=${encodeURIComponent(email)}; Path=/; Domain=.aimusicrebels.com; Max-Age=2592000; SameSite=Lax`;
}

function clearSharedAuthEmail() {
  document.cookie = `${sharedAuthCookie}=; Path=/; Domain=.aimusicrebels.com; Max-Age=0; SameSite=Lax`;
}

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
  const isPublicProfile = variant === "profile";
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(() => email ?? (isPublicProfile ? readSharedAuthEmail() : null));

  useEffect(() => {
    setResolvedEmail(email ?? (isPublicProfile ? readSharedAuthEmail() : null));
    if (!hasSupabaseConfig) return;
    const supabase = getSupabase();
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user?.email) {
        setResolvedEmail(data.user.email);
        writeSharedAuthEmail(data.user.email);
      } else if (!isPublicProfile) {
        setResolvedEmail(null);
      }
    });
    const { data: authState } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user?.email) {
        setResolvedEmail(session.user.email);
        writeSharedAuthEmail(session.user.email);
      } else if (_event === "SIGNED_OUT") {
        clearSharedAuthEmail();
        setResolvedEmail(null);
      }
    });
    return () => {
      mounted = false;
      authState.subscription.unsubscribe();
    };
  }, [email, isPublicProfile]);

  const resolvedAccountHref = accountHref || (resolvedEmail ? "/account" : "/login?next=/claim-subdomain");
  const resolvedAccountLabel = accountLabel || (resolvedEmail ? (isAccount ? "Account" : english ? "My profile" : "Mein Profil") : english ? "Sign in" : "Anmelden");
  const sitePath = (path: string) => isPublicProfile ? `${mainSite}${path}` : path;
  const accountTarget = resolvedAccountHref.startsWith("/") ? sitePath(resolvedAccountHref) : resolvedAccountHref;

  const menuItems = (
    <>
      <Link className="profile-nav-link active" href="/">Home</Link>
      <Link className="profile-nav-link" href={sitePath("/music")}>{english ? "Music" : "Musik"}</Link>
      <Link className="profile-nav-link" href="/#rebels">{english ? "Discover" : "Entdecken"}</Link>
      <Link className="profile-nav-link" href={sitePath("/example-profile")}>{english ? "Example profile" : "Beispielprofil"}</Link>
      <Link className="profile-nav-link" href={accountTarget}>{resolvedAccountLabel}</Link>
      {isAdmin && <Link className="profile-nav-link" href="/admin">Admin</Link>}
      {isAccount && onSignOut && <button type="button" className="profile-nav-link profile-nav-logout" onClick={onSignOut}>{english ? "Sign out" : "Abmelden"}</button>}
      {!isAccount && !resolvedEmail && <Link className="profile-nav-join" href={sitePath("/register?next=/claim-subdomain")}>{english ? "Claim your free subdomain" : "Kostenlose Subdomain sichern"}</Link>}
      <LanguageSwitcher />
    </>
  );

  return <nav className={`nav profile-nav ${isAccount ? "profile-nav-account" : ""}`}>
    <Link className="profile-brand" href="/" aria-label="AI Music Rebels Startseite">
      <img src="/ai-music-rebels-logo.webp" alt="AI Music Rebels" />
    </Link>

    <div className={`profile-nav-actions ${styles.desktopActions}`}>
      {menuItems}
    </div>

    <details className={styles.mobileMenu}>
      <summary className={styles.mobileSummary} aria-label={english ? "Open menu" : "Menü öffnen"}>
        <span className={styles.burger} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </summary>
      <div className={styles.mobilePanel}>
        {menuItems}
      </div>
    </details>
  </nav>;
}
