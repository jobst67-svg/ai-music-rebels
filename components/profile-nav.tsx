"use client";

import Link from "next/link";

export function ProfileNav() {
  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    if (document.referrer) {
      window.location.assign(document.referrer);
      return;
    }
    window.location.assign("https://aimusicrebels.com");
  }

  return <nav className="nav profile-nav">
    <Link className="profile-brand" href="https://aimusicrebels.com" aria-label="AI Music Rebels Startseite">
      <img src="/ai-music-rebels-logo.webp" alt="AI Music Rebels" />
    </Link>
    <div className="profile-nav-actions">
      <button type="button" className="profile-nav-button" onClick={goBack}>← Zurück</button>
      <Link className="profile-nav-button" href="https://aimusicrebels.com">Startseite</Link>
      <Link className="profile-nav-button" href="https://aimusicrebels.com/login">Account</Link>
    </div>
  </nav>;
}
