import type { Metadata } from "next";
import CustomerPenaltyCounter from "@/components/dashboard/CustomerPenaltyCounter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountSeoLayout({ children }: { children: React.ReactNode }) {
  return <><CustomerPenaltyCounter />{children}</>;
}
