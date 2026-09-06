"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher, useSiteLocale } from "@/components/language-switcher";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import styles from "./profile-nav.module.css";

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
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(email);

  useEffect(() => {
    setResolvedEmail(email);
    if (!hasSupabaseConfig) return;
    const supabase = getSupabase();
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) setResolvedEmail(data.user?.email ?? null);
    });
    const { data: authState } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setResolvedEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      authState.subscription.unsubscribe();
    };
  }, [email]);

  const resolvedAccountHref = accountHref || (resolvedEmail ? "/account" : "/login?next=/claim-subdomain");
  const resolvedAccountLabel = accountLabel || (resolvedEmail ? (isAccount ? "Account" : english ? "My profile" : "Mein Profil") : english ? "Sign in" : "Anmelden");

  const menuItems = (
    <>
      <Link className="profile-nav-link active" href="/">Home</Link>
      <Link className="profile-nav-link" href="/music">{english ? "Music" : "Musik"}</Link>
      <Link className="profile-nav-link" href="/#rebels">{english ? "Discover" : "Entdecken"}</Link>
      <Link className="profile-nav-link" href="/example-profile">{english ? "Example profile" : "Beispielprofil"}</Link>
      <Link className="profile-nav-link" href={resolvedAccountHref}>{resolvedAccountLabel}</Link>
      {isAdmin && <Link className="profile-nav-link" href="/admin">Admin</Link>}
      {isAccount && onSignOut && <button type="button" className="profile-nav-link profile-nav-logout" onClick={onSignOut}>{english ? "Sign out" : "Abmelden"}</button>}
      {!isAccount && !resolvedEmail && <Link className="profile-nav-join" href="/register?next=/claim-subdomain">{english ? "Join Now" : "Jetzt mitmachen"}</Link>}
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
