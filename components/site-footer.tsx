import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";

export function SiteFooter() {
  return <footer className="site-footer shell">
    <span>© {new Date().getFullYear()} AI Music Rebels</span>
    <div>
      <Link href="/legal/agb">AGB</Link>
      <Link href="/legal/datenschutz">Datenschutz</Link>
      <Link href="/legal/impressum">Impressum</Link>
      <LanguageSwitcher />
    </div>
  </footer>;
}
