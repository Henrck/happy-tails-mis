import type { Metadata } from "next";

// This route contains authentication or private account functionality.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SignUpSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
