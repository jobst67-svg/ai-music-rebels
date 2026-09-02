"use client";

import { useEffect, useState } from "react";

export type SiteLocale = "de" | "en";

function savedLocale(): SiteLocale {
  if (typeof window === "undefined") return "de";
  return window.localStorage.getItem("aimr_locale") === "en" ? "en" : "de";
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
