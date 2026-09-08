import type { Metadata } from "next";
import "./globals.css";
import { AutoTranslate } from "@/components/language-switcher";

export const metadata: Metadata = {
  metadataBase: new URL("https://aimusicrebels.com"),
  title: "AI Music Rebels",
  description: "Create your free artist profile and share your music, links and videos in one place.",
  alternates: {
    canonical: "https://aimusicrebels.com/"
  },
  openGraph: {
    type: "website",
    url: "https://aimusicrebels.com/",
    siteName: "AI Music Rebels",
    title: "AI Music Rebels",
    description: "Create your free artist profile and share your music, links and videos in one place.",
    images: [
      {
        url: "/ai-music-rebels-logo.webp",
        width: 1500,
        height: 1500,
        alt: "AI Music Rebels logo"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Music Rebels",
    description: "Create your free artist profile and share your music, links and videos in one place.",
    images: ["/ai-music-rebels-logo.webp"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body><AutoTranslate />{children}</body>
    </html>
  );
}
