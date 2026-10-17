"use client";

import type { WalkInServiceChoice } from "./ServiceChoiceStep";

// Transcribed from the HappyTails printed waivers supplied by the shop.
// Review the text against the original signed paper forms before production use.
const GROOMING_WAIVER = `I certify that I am the pet owner. I fully understand that pet grooming entails bathing, hair trimming, nails and ear cleaning. There is no physical examination occurring in the process of your pet grooming session. Grooming may cause trauma or stress to your dog / cat; however, I understand the grooming team of Happy Tails Pet Grooming Cafe will use all reasonable and safe precautions against injury or escape activity.

I am aware that sometimes, a skin reaction may arise after grooming due to my pet's skin sensitivity, behavioral activity and severity of matted coat. Thus it may cause wounds, rashes, and / or inflammatory reactions to the clipper blade. Therefore, the business shall not be held liable for any problem that may transpire from either matted coat condition, sick pet or disorganized pet behavior brought about by grooming of my pet, provided reasonable care and safety precautions are safely followed.

The groomers of Happy Tails Pet Grooming Cafe make no claim of expertise in grooming or any particular breed. Our team would make reasonable effort and dedication to meet your grooming request. If an accident had been caused by an honest mistake of our grooming team, our facility is more than happy to provide post-services assistance; in such a case, report within 24 hours only.

Grooming may take a couple of hours to complete and pets will be served on a FIRST COME, FIRST SERVED basis. After carefully reading the above, I agree to these terms.`;

const BOARDING_WAIVER = `TERMS AND CONDITIONS:

Pet owner(s) understands and agrees that in admitting my pet, Happy Tails Pet Grooming Cafe has relied upon my representation that my pet is in good health, with complete vaccination, updated anti-rabies, vet record and has not harmed or shown aggressive or threatening behavior towards any person or any other pet. The owner ensures that their pet is clean prior to check in, or you can avail our bath & dry service upon checking in.

Owners may leave personal items of their pet (as long as it fits in the kennel) and understand that our establishment is not responsible for these items if damaged, as long as we kept track and made every effort to take care of your pet's items.

I understand that certain risks are inherent in pet boarding activity. These unpredictable scenarios include but are not limited to injury caused by my own pet's behavior, stress, anxiousness and other risks due to separation anxiety. In line with this, I fully release Happy Tails Pet Grooming Cafe from all liability, given that all precautionary safety procedures were followed.

If I am unreachable in the event of an emergency, I hereby authorize Happy Tails Pet Grooming Cafe to seek immediate veterinary care for my pet and understand that all costs in connection with veterinary, medical or other treatment shall be my responsibility.

I understand that I am solely responsible for any harm caused by my pet to our attendant/staff.`;

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
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border-2 border-pink-100 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-center text-xl font-bold text-brand-pink">{title}</h2>
        <p className="mt-2 text-center text-xs text-zinc-500">Please read the complete terms before agreeing.</p>
        <div
          aria-label={`${title} terms and conditions`}
          className="mt-5 max-h-[50vh] overflow-y-auto whitespace-pre-line rounded-xl border border-pink-100 bg-pink-50/20 p-4 pr-5 text-sm leading-6 text-zinc-700"
        >
          {text}
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Selecting Agree confirms that you have read and accept these terms for this booking.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onBack} className="min-h-11 rounded-full border-2 border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400">
            Disagree
          </button>
          <button type="button" onClick={onAgree} className="min-h-11 rounded-full bg-brand-pink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-pink-dark">
            Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
