import type { Metadata } from "next";
import "./globals.css";

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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1e3a5f] focus:text-white focus:rounded-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
