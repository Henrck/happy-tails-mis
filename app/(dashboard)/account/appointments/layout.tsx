import type { ReactNode } from "react";
import ManagementStepConfirmation from "@/components/shared/ManagementStepConfirmation";
import "./booking-polish.css";

export default function BookingLayout({ children }: { children: ReactNode }) {
  return (
    <section className="ht-booking-v4">
      <ManagementStepConfirmation>{children}</ManagementStepConfirmation>
    </section>
  );
}
