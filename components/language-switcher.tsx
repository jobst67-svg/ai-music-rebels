"use client";

import { useEffect, useState } from "react";

export type SiteLocale = "de" | "en";

function savedLocale(): SiteLocale {
  if (typeof window === "undefined") return "de";
  const cookieLocale = document.cookie.match(/(?:^|; )aimr_locale=(en|de)(?:;|$)/)?.[1];
  return cookieLocale === "en" || window.localStorage.getItem("aimr_locale") === "en" ? "en" : "de";
}

export function useSiteLocale() {
  const [locale, setLocale] = useState<SiteLocale>("de");

  useEffect(() => {
    const update = () => setLocale(savedLocale());
    update();
    window.addEventListener("aimr-locale", update);
    return () => window.removeEventListener("aimr-locale", update);
  }, []);

  return locale;
}

export function LanguageSwitcher() {
  const locale = useSiteLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  function changeLocale(next: SiteLocale) {
    window.localStorage.setItem("aimr_locale", next);
    document.cookie = `aimr_locale=${next}; Path=/; Domain=.aimusicrebels.com; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    document.documentElement.dataset.locale = next;
    window.dispatchEvent(new Event("aimr-locale"));
  }

  return (
    <label className="language-switcher" aria-label="Language">
      <span className="sr-only">Language</span>
      <select value={locale} onChange={(event) => changeLocale(event.target.value as SiteLocale)}>
        <option value="de">DE</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}

const deToEn: Record<string, string> = {
  "So geht's": "How it works",
  "Beispielprofil": "Example profile",
  "Anmelden": "Sign in",
  "Abmelden": "Sign out",
  "Registrieren": "Sign up",
  "Werde ein Rebel.": "Become a Rebel.",
  "Willkommen zurück.": "Welcome back.",
  "Ein Account für deine Subdomain und dein öffentliches Künstlerprofil.": "One account for your subdomain and public artist profile.",
  "E-Mail": "Email",
  "Passwort": "Password",
  "Account anlegen": "Create account",
  "Bestätigungsmail erneut senden": "Resend confirmation email",
  "Bitte warten …": "Please wait …",
  "Bitte bestätige jetzt deine E-Mail-Adresse. Danach kannst du deine Adresse reservieren.": "Please confirm your email address. You can then reserve your address.",
  "Neue Bestätigungs-E-Mail wurde gesendet.": "A new confirmation email has been sent.",
  "Zurück zur Startseite": "Back to home",
  "Profil nicht gefunden.": "Profile not found.",
  "Diese Künstlerseite ist noch nicht veröffentlicht oder existiert nicht.": "This artist page is not published yet or does not exist.",
  "Dieses Profil wird gerade aufgebaut.": "This profile is currently being built.",
  "Private Vorschau": "Private preview",
  "Vorschau wird geladen …": "Loading preview …",
  "Bearbeiten": "Edit",
  "Kanalbanner": "Channel banner",
  "Kanalbild": "Channel image",
  "Künstlername": "Artist name",
  "Kurzer Satz": "Short line",
  "Bio": "Bio",
  "Wo veröffentlichst du deine Musik?": "Where do you publish your music?",
  "Entdecken": "Discover",
  "Startseite": "Home",
  "Zurück": "Back",
  "Jetzt mitmachen": "Join Now",
  "Plattformen ändern": "Change platforms",
  "Plattformauswahl schließen": "Close platform selection",
  "Noch keine Plattform ausgewählt": "No platform selected",
  "Akzentfarbe": "Accent color",
  "Spotify-Link": "Spotify link",
  "YouTube-Kanal-Link": "YouTube channel link",
  "Suno-Link": "Suno link",
  "TikTok-Link": "TikTok link",
  "Facebook-Link": "Facebook link",
  "Dein Künstlerbereich": "Your artist area",
  "Profil gestalten.": "Shape your profile.",
  "Du hast noch keine Subdomain reserviert.": "You have not reserved a subdomain yet.",
  "Deine Daten speichern wir sofort. Öffentlich wird die Seite erst nach Freischaltung.": "Your details are saved immediately. The page only becomes public after activation.",
  "Subdomain sichern": "Claim subdomain",
  "Vorschau": "Preview",
  "Profil-Vorschau": "Profile preview",
  "Änderungen speichern": "Save changes",
  "Gespeichert. Dein Kanal wird nach der Freischaltung öffentlich sichtbar.": "Saved. Your channel will become public after approval.",
  "Kanalzugang": "Channel access",
  "Basisprofil": "Basic profile",
  "Kostenloser Monat aktiv": "Free month active",
  "Vollzugriff": "Full access",
  "Kanal aktivieren": "Activate channel",
  "Öffnet …": "Opening …",
  "Abo verwalten": "Manage subscription",
  "Titel, Videos und interne Vorschauen sind freigeschaltet.": "Tracks, videos and internal previews are unlocked.",
  "Banner, Bio und Links bleiben sichtbar. Deine Titel und Videos warten gespeichert auf die Reaktivierung.": "Banner, bio and links remain visible. Your tracks and videos stay stored until reactivation.",
  "Nach einem abgelaufenen Abo darf AI Music Rebels mir maximal monatlich eine Erinnerung zur Reaktivierung schicken.": "After an expired subscription, AI Music Rebels may send me at most one reactivation reminder per month.",
  "Deine Videos": "Your videos",
  "Füge bis zu fünf Videos ein. Beim sechsten wird das älteste automatisch entfernt.": "Add up to five videos. When adding a sixth, the oldest is removed automatically.",
  "Video hinzufügen": "Add video",
  "Titel (optional)": "Title (optional)",
  "Deine Titel": "Your tracks",
  "Lege Titel für die Plattformen an, die du oben ausgewählt hast. Ein Klick auf die Karte führt direkt zum Song.": "Add tracks for the platforms selected above. Clicking a card opens the song directly.",
  "Wähle oben mindestens eine Musikplattform aus.": "Select at least one music platform above.",
  "+ Neue Titelkarte": "+ New track card",
  "Eingabe schließen": "Close entry",
  "Plattform auswählen": "Select platform",
  "Songtitel": "Song title",
  "Direkter Link zum Song": "Direct song link",
  "Cover (optional)": "Cover (optional)",
  "Titel hinzufügen": "Add track",
  "Ausgewählte Titel": "Selected tracks",
  "Neueste Videos": "Latest videos",
  "Entfernen": "Remove",
  "Künstlerseite": "Artist page",
  "Rechtliches": "Legal",
  "Datenschutz": "Privacy",
  "Impressum": "Legal notice",
  "AGB": "Terms",
  "Nutzer verwalten.": "Manage users.",
  "Nutzer werden geladen …": "Loading users …",
  "Sperren": "Block user",
  "Entsperren": "Unblock",
  "Abo kündigen": "Cancel subscription",
  "Profil- und Abodaten": "Profile and subscription data",
  "Öffentlich": "Published",
  "Plattformen": "Platforms",
  "Testmonat endet": "Trial ends",
  "Reaktivierungs-Mail": "Reactivation email",
  "Noch kein Künstlerprofil bzw. kein Abo vorhanden.": "No artist profile or subscription yet.",
  "Independent AI music artist": "Independent AI music artist"
  ,"Gratisprofil": "Free profile"
  ,"Premiumprofil": "Premium profile"
  ,"Nur der kostenlose Profil-Ausschnitt wird angezeigt.": "Only the free profile excerpt is shown."
  ,"Vollständiges Premiumprofil": "Full premium profile"
  ,"Das Premiumprofil ist für diesen Kanal noch nicht freigeschaltet.": "The premium profile is not enabled for this channel yet."
  ,"Kostenlose Subdomain sichern": "Claim free subdomain"
  ,"Anmelden & sichern": "Sign in & claim"
  ,"Profil wird erstellt …": "Creating your profile …"
  ,"Premium aktivieren": "Activate premium"
  ,"Premium sichern": "Get premium"
};

const enToDe = Object.fromEntries(Object.entries(deToEn).map(([de, en]) => [en, de]));

function translated(value: string, locale: SiteLocale) {
  const match = value.match(/^(\s*)(.*?)(\s*)$/s);
  if (!match) return value;
  const table = locale === "en" ? deToEn : enToDe;
  return table[match[2]] ? `${match[1]}${table[match[2]]}${match[3]}` : value;
}

function translatePage(locale: SiteLocale) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const element = node.parentElement;
      if (!element || element.closest("script,style,code,pre,.legal-copy,[contenteditable='true']")) return NodeFilter.FILTER_REJECT;
      return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach((node) => { node.nodeValue = translated(node.nodeValue ?? "", locale); });

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder],textarea[placeholder]").forEach((element) => {
    element.placeholder = translated(element.placeholder, locale);
  });
}

export function AutoTranslate() {
  const locale = useSiteLocale();

  useEffect(() => {
    translatePage(locale);
    const observer = new MutationObserver(() => translatePage(locale));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
