"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import { LanguageSwitcher, useSiteLocale } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-footer";
import styles from "./home.module.css";

type Rebel = { id:string; slug:string; artist_name:string|null; image_path:string|null; tagline:string|null };

function RebelsLogo({ footer = false }: { footer?: boolean }) {
  return <img className={footer ? styles.footerLogoImage : styles.headerLogoImage} src="/ai-music-rebels-logo.webp" alt="AI Music Rebels" />;
}

export default function HomePage() {
  const locale = useSiteLocale();
  const english = locale === "en";
  const [email, setEmail] = useState<string|null>(null);
  const [rebels, setRebels] = useState<Rebel[]>([]);
  const [authBusy, setAuthBusy] = useState(false);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const supabase = getSupabase();
    supabase.auth.getUser().then(({data}) => setEmail(data.user?.email ?? null));
    supabase.from("artist_profiles").select("id,slug,artist_name,image_path,tagline").eq("is_published",true).order("updated_at",{ascending:false}).limit(10)
      .then(({data}) => setRebels((data as Rebel[]|null) ?? []));
  }, []);

  async function continueWithGoogle() {
    if (!hasSupabaseConfig) return;
    setAuthBusy(true);
    const redirectTo = `${window.location.origin}/auth?next=${encodeURIComponent("/claim-subdomain")}`;
    const { error } = await getSupabase().auth.signInWithOAuth({ provider:"google", options:{ redirectTo } });
    if (error) { console.error(error); setAuthBusy(false); }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <Link className={styles.brandLink} href="/"><RebelsLogo /></Link>
          <div className={styles.navlinks}>
            <Link className={styles.activeNav} href="/">Home</Link>
            <a href="#rebels">{english ? "Discover" : "Entdecken"}</a>
            <a href="#how">{english ? "How it works" : "So geht's"}</a>
            <Link href={email ? "/account" : "/auth?next=/claim-subdomain"}>{email ? "Account" : english ? "Login" : "Anmelden"}</Link>
            <LanguageSwitcher />
            {!email && <Link className={styles.joinButton} href="/auth?next=/claim-subdomain">{english ? "Join Now" : "Jetzt mitmachen"}</Link>}
          </div>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>{english ? "Independent creators. Real music. Bigger tomorrow." : "Independent Creators. Echte Musik. Größer morgen."}</div>
            <h1><span>{english ? "YOUR MUSIC." : "DEINE MUSIK."}</span><span className={styles.green}>{english ? "YOUR PROFILE." : "DEIN PROFIL."}</span><span>{english ? "YOUR RULES." : "DEINE REGELN."}</span></h1>
            <p>{english ? "Create your own free artist profile and share your music, links and videos — all in one place. Built for AI music creators. By creators." : "Erstelle dein kostenloses Künstlerprofil und zeig Musik, Links und Videos an einem Ort. Gebaut für AI Music Creator. Von Creators."}</p>
            {email ? <Link className={styles.primaryButton} href="/claim-subdomain">{english ? "Claim your subdomain" : "Subdomain sichern"}</Link> : <div className={styles.signupButtons}>
              <button type="button" className={styles.googleButton} onClick={continueWithGoogle} disabled={authBusy}><span className={styles.googleMark}>G</span>{authBusy ? (english ? "Connecting …" : "Verbinden …") : (english ? "Continue with Google" : "Mit Google registrieren")}</button>
              <div className={styles.or}><span />{english ? "OR" : "ODER"}<span /></div>
              <Link className={styles.emailButton} href="/auth?next=/claim-subdomain">✉ {english ? "Register with Email" : "Mit E-Mail registrieren"}</Link>
            </div>}
            <div className={styles.promises}><span>◎ {english ? "Lifetime free subdomain" : "Subdomain dauerhaft kostenlos"}</span><span>▣ {english ? "No credit card required" : "Keine Kreditkarte nötig"}</span></div>
          </div>
          <div className={styles.heroVisual} aria-hidden="true">
            <img className={styles.heroWoman} src="/rebels-hero-woman.webp" alt="" />
            <div className={styles.heroGlow} />
          </div>
        </section>

        <section id="rebels" className={styles.rebelsSection}>
          <div className={styles.sectionHead}>
            <div><p>{english ? "The latest artists to join the rebellion." : "Die neuesten Artists der Rebellion."}</p></div>
            <div className={styles.sectionActions}><span>{english ? "Swipe to discover" : "Wischen zum Entdecken"}</span><div className={styles.arrows}><button type="button" onClick={() => rail.current?.scrollBy({left:-520,behavior:"smooth"})}>‹</button><button type="button" onClick={() => rail.current?.scrollBy({left:520,behavior:"smooth"})}>›</button></div></div>
          </div>
          <div className={styles.rail} ref={rail}>
            {rebels.map((artist) => <a className={styles.artistCard} href={`https://${artist.slug}.aimusicrebels.com`} onClick={(event) => { if (window.location.hostname.endsWith(".vercel.app")) { event.preventDefault(); window.location.assign(`/artist/${artist.slug}`); } }} key={artist.id}><div className={styles.avatar}>{artist.image_path ? <img src={artist.image_path} alt="" /> : <span>{(artist.artist_name || "R").slice(0,1)}</span>}</div><strong>{artist.artist_name || artist.slug}</strong><small>{artist.tagline || "AI Music"}</small></a>)}
            {rebels.length === 0 && <div className={styles.emptyCard}><div className={styles.avatar}><span>⚡</span></div><strong>{english ? "The first Rebels are coming." : "Die ersten Rebellen kommen."}</strong><small>{english ? "Your profile can be one of them." : "Dein Profil kann dazugehören."}</small></div>}
            <Link className={`${styles.artistCard} ${styles.claimCard}`} href="/auth?next=/claim-subdomain"><div className={styles.plus}>+</div><strong>{english ? "Claim your own profile" : "Hol dir dein eigenes Profil"}</strong><small>Join the rebellion</small></Link>
          </div>
        </section>

        <section id="how" className={styles.benefits}>
          <div><b>♫</b><span>{english ? "Showcase your tracks" : "Zeig deine Tracks"}</span></div>
          <div><b>◎</b><span>{english ? "Connect with listeners" : "Verbinde dich mit Hörern"}</span></div>
          <div><b>⌘</b><span>{english ? "All your links in one place" : "Alle Links an einem Ort"}</span></div>
          <div><b>▥</b><span>{english ? "Grow your audience on your terms" : "Wachse nach deinen Regeln"}</span></div>
        </section>

        <section className={styles.rebellionFooter}>
          <div className={styles.footerIdentity}><RebelsLogo footer /><p>{english ? "Independent artists. A louder tomorrow." : "Independent Artists. Eine lautere Zukunft."}</p></div>
          <Link className={styles.rebellionCta} href="/auth?next=/claim-subdomain"><img className={styles.rebellionCtaImage} src="/rebellion-cta.png" alt={english ? "Join the rebellion" : "Der Rebellion beitreten"} /></Link>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
