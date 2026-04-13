import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

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
      <body className={`${publicSans.variable} antialiased`}>
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
