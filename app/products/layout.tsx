import type { Metadata } from "next";

const description =
  "Browse pet products and supplies at Happy Tails Pet Grooming Cafe. Discover items for your furry companions.";

export const metadata: Metadata = {
  title: "Pet Products & Supplies",
  description,
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Pet Products & Supplies | Happy Tails Pet Grooming Cafe",
    description,
    url: "/products",
    images: [{ url: "/images/hero-bg.png", alt: "Happy Tails Pet Grooming Cafe" }],
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
