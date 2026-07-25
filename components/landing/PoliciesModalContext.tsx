"use client";
// Shared state so the "POLICIES" buttons in both the Grooming and Boarding
// pricing sections can open the same modal, without prop-drilling through
// the page. Wrap the page content in <PoliciesModalProvider> once, and any
// button anywhere on the page can call usePoliciesModal().open().
import { createContext, useContext, useState, type ReactNode } from "react";

type PoliciesModalContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const PoliciesModalContext = createContext<PoliciesModalContextValue | null>(
  null
);

export function PoliciesModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PoliciesModalContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </PoliciesModalContext.Provider>
  );
}

export function usePoliciesModal() {
  const ctx = useContext(PoliciesModalContext);
  if (!ctx) {
    throw new Error(
      "usePoliciesModal must be used within a PoliciesModalProvider"
    );
  }
  return ctx;
}
