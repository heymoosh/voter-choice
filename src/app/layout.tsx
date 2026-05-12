import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voter Choice",
  description: "Neutral ballot research prompts from verified state context.",
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
