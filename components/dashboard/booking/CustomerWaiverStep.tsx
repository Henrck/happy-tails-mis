"use client";

import WaiverStep from "@/components/admin/pos/walk-in/WaiverStep";
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";

/** Customer booking reuses the same service-specific waiver used in POS walk-in. */
export default function CustomerWaiverStep({ serviceType, onBack, onAgree }: {
  serviceType: WalkInServiceChoice;
  onBack: () => void;
  onAgree: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl py-4">
      <p className="mb-4 text-center text-sm text-zinc-500">Please review and agree to the service waiver before continuing with your booking.</p>
      <WaiverStep serviceType={serviceType} onBack={onBack} onAgree={onAgree} />
    </section>
  );
}
