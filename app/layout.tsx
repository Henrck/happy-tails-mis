import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { IS_PREVIEW_DEPLOYMENT, SITE_URL } from "@/lib/seo";
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

const siteName = "Happy Tails Pet Grooming Cafe";
const siteDescription =
  "Discover dog and cat grooming, pet boarding, spa services, and pet products at Happy Tails Pet Grooming Cafe. Explore our services and book online.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: siteName,
  title: {
    default: "Happy Tails Pet Grooming Cafe | Grooming & Pet Boarding",
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName,
    title: "Happy Tails Pet Grooming Cafe | Grooming & Pet Boarding",
    description: siteDescription,
    url: "/",
    images: [{ url: "/images/hero-bg.png", alt: siteName }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Happy Tails Pet Grooming Cafe | Grooming & Pet Boarding",
    description: siteDescription,
    images: ["/images/hero-bg.png"],
  },
  robots: IS_PREVIEW_DEPLOYMENT
    ? { index: false, follow: false }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
        },
      },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
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
