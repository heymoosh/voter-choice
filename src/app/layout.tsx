import type { Metadata, Viewport } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
// Phase 7 — printable ballot stylesheet. Scoped to `.print-sheet` /
// `.print-shell` / `.no-print`, loaded here so the rules are available
// across every route the print view might mount under.
import "../styles/print.css";

// 2026-redesign visual foundation — three fonts wired via next/font.
// Newsreader (serif) is the editorial display + heading family;
// IBM Plex Sans is the default body; IBM Plex Mono powers the
// eyebrow labels ("PROGRESS", "ELECTION GUIDE", etc.). Each instance
// exposes a `.variable` className that injects a --font-* custom
// property; we attach all three to <body> so the tokens defined in
// globals.css can chain through them at every level of the tree.
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-newsreader",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
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
        className={`${newsreader.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}
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
