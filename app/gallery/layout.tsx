import type { Metadata } from "next";

const description =
  "Explore the Happy Tails Pet Grooming Cafe gallery, featuring adorable pets and before-and-after grooming photos.";

export const metadata: Metadata = {
  title: "Pet Grooming Gallery",
  description,
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Pet Grooming Gallery | Happy Tails Pet Grooming Cafe",
    description,
    url: "/gallery",
    images: [{ url: "/images/hero-bg.png", alt: "Happy Tails Pet Grooming Cafe" }],
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
