import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
// Phase 7 — printable ballot stylesheet. Scoped to `.print-sheet` /
// `.print-shell` / `.no-print`, loaded here so the rules are available
// across every route the print view might mount under.
import "../styles/print.css";

// 2026-redesign visual foundation — the IBM Plex trio wired via next/font.
// Production boots Civic mood (`data-mood="civic"`), which uses IBM Plex
// Serif for headlines, IBM Plex Sans for body, and IBM Plex Mono for
// eyebrow labels ("PROGRESS", "ELECTION GUIDE", etc.). Each next/font
// instance exposes a `.variable` className that injects a --font-* custom
// property; we attach all three to <body> so the tokens defined in
// globals.css can chain through them at every level of the tree.
//
// The other moods from the prototype Tweaks panel (editorial → Newsreader,
// manifesto → Space Grotesk + JetBrains Mono) are not loaded here — that
// infrastructure ships behind a future `?tweaks=1` dev-only path
// (deferred from PR A1). Hardcoding Civic for production users means
// no Newsreader / Space Grotesk / JetBrains Mono webfont bytes are
// shipped to the public.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Voter Choice — Free AI Ballot Research Tool",
  description:
    "Research your ballot with AI. Enter your zip code, chat with an AI assistant about every race and issue, and get a printable ballot to take to the polls. Free, private, nonpartisan.",
  openGraph: {
    title: "Voter Choice — Free AI Ballot Research Tool",
    description:
      "Research your ballot with AI. Enter your zip code, chat with an AI assistant about every race and issue, and get a printable ballot to take to the polls. Free, private, nonpartisan.",
    type: "website",
    locale: "en_US",
    siteName: "Voter Choice",
  },
  twitter: {
    card: "summary_large_image",
    title: "Voter Choice — Free AI Ballot Research Tool",
    description:
      "Research your ballot with AI. Enter your zip code, chat with an AI assistant about every race and issue, and get a printable ballot to take to the polls.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        // 2026-redesign visual defaults — Civic mood, Civic-green palette,
        // Daylight (light/cream paper) treatment. Hardcoded for every
        // production user. globals.css consumes these data-attrs via
        // `body[data-mood="civic"]` etc. to wire the typography + color
        // tokens. A future dev-only `?tweaks=1` flow will mount a
        // Tweaks panel that can flip these at runtime; production users
        // never see the panel and always boot Civic.
        data-mood="civic"
        data-palette="civic"
        data-treatment="daylight"
        className={`${ibmPlexSans.variable} ${ibmPlexSerif.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-sm"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
