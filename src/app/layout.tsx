import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voter Choice — Ballot Research Tool",
  description:
    "Free AI-powered ballot research tool for U.S. voters. Enter your zip code to get a customized prompt you can paste into any AI chatbot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-blue-700 focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:outline-2 focus:outline-blue-500"
          aria-label="Skip to main content"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
