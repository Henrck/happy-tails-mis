import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

// Fredoka: rounded, playful — used for headings, matches the logo/mascot tone.
const fredoka = Fredoka({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Nunito: also rounded but far more legible at small sizes — used for body
// text, price tables, and anywhere reading matters more than personality.
const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Happy Tails Pet Grooming Cafe",
  description:
    "Grooming, boarding, spa, and treats — all in one happy place for your pet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning here specifically: browser extensions
          like Grammarly inject attributes (data-gr-ext-installed, etc.)
          into <body> after the page loads, which React then flags as a
          hydration mismatch even though nothing in this app caused it.
          This only suppresses warnings on this one element — it won't
          hide a real mismatch anywhere else in the tree. */}
      <body className="min-h-full flex flex-col font-body" suppressHydrationWarning>{children}</body>
    </html>
  );
}
