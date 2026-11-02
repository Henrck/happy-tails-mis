import type { Metadata } from "next";

// This route contains authentication or private account functionality.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
