"use client";

import { useCallback, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import ActionConfirmModal from "@/components/admin/operations/ActionConfirmModal";

type PendingAction = {
  button: HTMLButtonElement;
  title: string;
  description: string;
  confirmLabel: string;
};

/**
 * Confirms only consequential navigation, not routine Back/Next/Continue steps.
 *
 * - Walking out of an unfinished POS booking is confirmed automatically.
 * - Other screens can explicitly opt in with data-confirm-step="leave".
 * - Existing save, cancellation, archive, and checkout dialogs continue to
 *   manage their own confirmations and are never intercepted here.
 *
 * This keeps the existing handlers untouched, including form validations.
 */
export default function ManagementStepConfirmation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const allowedButton = useRef<HTMLButtonElement | null>(null);

  const intercept = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button");
    if (!(button instanceof HTMLButtonElement) || button.disabled) return;

    // Allow the confirmed click through exactly once.
    if (allowedButton.current === button) {
      allowedButton.current = null;
      return;
    }
    if (button.dataset.skipStepConfirmation === "true") return;

    const label = (button.textContent ?? "").replace(/\s+/g, " ").trim();
    const leavingPos = pathname.startsWith("/admin/pos/walk-in") &&
      /^(?:←\s*)?back to pos$/i.test(label);
    const explicitlyLeaving = button.dataset.confirmStep === "leave";

    // No global matching for "Back", "Next", or "Continue".
    // Those are normal wizard navigation, not consequential operations.
    if (!leavingPos && !explicitlyLeaving) return;

    event.preventDefault();
    event.stopPropagation();
    setPending({
      button,
      title: leavingPos ? "Leave walk-in booking?" : "Leave this step?",
      description: leavingPos
        ? "Are you sure you want to return to POS? The unfinished walk-in booking will not be saved."
        : "Are you sure you want to leave? Any unsaved changes on this step may be lost.",
      confirmLabel: leavingPos ? "Yes, return to POS" : "Yes, leave",
    });
  }, [pathname]);

  const confirm = () => {
    if (!pending) return;
    const button = pending.button;
    setPending(null);
    if (!button.isConnected || button.disabled) return;
    allowedButton.current = button;
    try {
      button.click();
    } finally {
      allowedButton.current = null;
    }
  };

  return (
    <div onClickCapture={intercept} className="min-w-0 w-full">
      {children}
      {pending && (
        <ActionConfirmModal
          title={pending.title}
          description={pending.description}
          confirmLabel={pending.confirmLabel}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
