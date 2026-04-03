import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "../lib/i18n";
import SkipLink from "../components/SkipLink";

export const metadata: Metadata = {
  title: "Ballot Research Tool — Research Your Ballot with AI",
  description:
    "Enter your zip code, get a customized AI prompt, and paste it into any free chatbot to research your ballot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#fafaf9] text-[#1f2937] antialiased font-sans">
        <LanguageProvider>
          <SkipLink />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
