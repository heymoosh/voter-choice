import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voter Choice",
  description: "Ballot research with state election context and enrichment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
