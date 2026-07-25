"use client";
// The "POLICIES" pill button used in both the Grooming and Boarding pricing
// cards. Opens the shared PoliciesModal.
// variant="outline" (default) is for use on the pink card background.
// variant="solid" is for use on white/light backgrounds (e.g. inside the
// new PricingCard body, which sits on a white/tint area, not pink).
import { usePoliciesModal } from "./PoliciesModalContext";

export default function PoliciesButton({
  variant = "outline",
}: {
  variant?: "outline" | "solid";
}) {
  const { open } = usePoliciesModal();

  const styles =
    variant === "solid"
      ? "bg-brand-pink hover:bg-brand-pink-dark text-white"
      : "border-2 border-white text-white hover:bg-white hover:text-brand-pink";

  return (
    <button
      onClick={open}
      className={`font-semibold text-sm px-8 py-2 rounded-full transition-colors ${styles}`}
    >
      POLICIES
    </button>
  );
}
