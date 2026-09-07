"use client";
// Waiver step, shown right after service selection — matches the
// "Grooming Waiver" / "Boarding Waiver" popups in the customer account
// UI design. Text below is transcribed exactly from that design image
// up to where the source image itself gets cut off — the remainder
// (the skin-reaction clause and whatever follows it) isn't visible in
// what was provided, so it's marked clearly as a placeholder rather
// than invented. Fill in the real remaining clauses before this goes
// live — this is content data, not something to guess at.
import type { WalkInServiceChoice } from "./ServiceChoiceStep";

const GROOMING_WAIVER = `I certify that I am the pet owner. I fully understand that pet grooming entails bathing, hair trimming, nails and ear cleaning. There is no physical examination occurring in the process of your pet grooming session. Grooming may cause trauma or stress to your dog / cat; However, I understand the grooming team of Happy Tails Pet Grooming Cafe, will use all reasonable and safe precautions against injury or escape activity.

I am aware that sometimes, a skin reaction may arise after...

[Remaining waiver text not available in the source design — replace this placeholder with the complete clause before going live.]`;

const BOARDING_WAIVER = `I certify that I am the pet owner. I fully understand that pet grooming entails bathing, hair trimming, nails and ear cleaning. There is no physical examination occurring in the process of your pet grooming session. Grooming may cause trauma or stress to your dog / cat; However, I understand the grooming team of Happy Tails Pet Grooming Cafe, will use all reasonable and safe precautions against injury or escape activity.

I am aware that sometimes, a skin reaction may arise after...

[Remaining waiver text not available in the source design — replace this placeholder with the complete clause before going live.]`;

export default function WaiverStep({
  serviceType,
  onBack,
  onAgree,
}: {
  serviceType: WalkInServiceChoice;
  onBack: () => void;
  onAgree: () => void;
}) {
  const isBoarding = serviceType === "boarding";
  const title = isBoarding ? "Boarding Waiver" : "Grooming Waiver";
  const text = isBoarding ? BOARDING_WAIVER : GROOMING_WAIVER;

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-3xl border-2 border-pink-100 p-6">
        <h2 className="text-xl font-bold text-brand-pink text-center">{title}</h2>
        <div className="mt-4 max-h-64 overflow-y-auto text-sm text-zinc-600 leading-relaxed whitespace-pre-line pr-1">
          {text}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
            Disagree
          </button>
          <button onClick={onAgree} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
            Agree
          </button>
        </div>
      </div>
    </div>
  );
}
