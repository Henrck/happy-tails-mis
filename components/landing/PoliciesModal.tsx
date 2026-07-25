"use client";
// The Grooming and Boarding "Paw-licy" modal. Closes on the back button
// (top-left arrow) or by clicking outside the modal card.
// Note: policy text is meant to be editable later via the admin/MIS module.
import Image from "next/image";
import { usePoliciesModal } from "./PoliciesModalContext";

const policies = [
  "Pets must be at least 3 months old",
  "Pets must be fully vaccinated  not pregnant nor heat",
  "Vaccination record is required for boarding care, please bring your own pet food and feeder",
  "NO Boarding and grooming for sick pets.",
  "Please bring your pet's owned tootbrush for teeth cleaning service.",
  "Please keep your pets on leashed inside the premise to ensure pets safety.",
  "Canceling or Rescheduling appointment should be made atleast 24 to 48hrs prior your booking slot.",
];

export default function PoliciesModal() {
  const { isOpen, close } = usePoliciesModal();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg bg-[#FDE4EE] border-4 border-brand-pink rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Back"
          className="absolute top-5 left-5 text-zinc-800 hover:text-brand-pink transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M5 12l6-6M5 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex flex-col items-center mt-4">
          <Image
            src="/images/logo.png"
            alt="Happy Tails"
            width={140}
            height={140}
            className="w-28 h-auto"
          />
          <div className="mt-2 border-2 border-zinc-900 rounded-full px-6 py-1.5 -rotate-1">
            <span className="text-brand-pink font-semibold italic text-sm">
              Grooming and Boarding Paw-licy
            </span>
          </div>
        </div>

        <ol className="mt-6 space-y-4 text-sm text-zinc-800">
          {policies.map((policy, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0">{i + 1}.</span>
              <span>{policy}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
