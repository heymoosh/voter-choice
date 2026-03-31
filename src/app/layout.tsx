import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Free AI Ballot Research Tool",
  description:
    "Enter your zip code to get a customized AI prompt pre-filled with your state's election dates, deadlines, and voting rules. Paste it into any free AI chatbot to research your ballot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Skip to main content — must be first in body */}
        <a
          href="#main-content"
          className="absolute -top-10 left-0 z-50 rounded-br-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:top-0"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
