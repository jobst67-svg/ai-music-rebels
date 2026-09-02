import type { Metadata } from "next";
import "./globals.css";
import { AutoTranslate } from "@/components/language-switcher";

export const metadata: Metadata = {
  metadataBase: new URL("https://aimusicrebels.com"),
  title: "AI Music Rebels",
  description: "Your public artist home for independent AI music."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body><AutoTranslate />{children}</body>
    </html>
  );
}
