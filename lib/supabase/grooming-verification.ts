import { createClient } from "@/lib/supabase/client";
import { fetchPetSizes, fetchPackagesFull } from "@/lib/supabase/services";
import { catGroomingSizeGuide, matchPetSize } from "@/lib/utils/pet-size-guide";
import type { ServiceType } from "@/lib/types/services";

export type VerificationPreview = {
  sizeId: string;
  sizeLabel: string;
  weightKg: number;
  previousLineAmount: number;
  newLineAmount: number;
  previousPackageAmount: number;
  newPackageAmount: number;
};

/**
 * Use exactly the same cat-size policy as pet registration and online booking:
 * Small = up to 5 kg, Large = above 5 kg. The raw pet_sizes.weight_range
 * field can contain legacy ranges, so it must not determine the cat tier here.
 *
 * Cat packages historically used one "Standard" price row for both sizes.
 * The accompanying migration creates size-specific price aliases with the
 * same amount, so the existing database verification RPC can also find them.
 */
export async function previewGroomingVerification(args: {
  serviceType: "dog_grooming" | "cat_grooming";
  packageId: string;
  oldPricingId: string;
  oldLineAmount: number;
  weightKg: number;
}): Promise<{ preview: VerificationPreview | null; error: string | null }> {
  const { serviceType, packageId, oldPricingId, oldLineAmount, weightKg } = args;
  const isCat = serviceType === "cat_grooming";
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 200 ||
      (isCat && !Number.isInteger(weightKg))) {
    return {
      preview: null,
      error: isCat
        ? "Enter a whole-number weight for the cat (1–200 kg)."
        : "Enter a valid measured weight (above 0 and up to 200 kg).",
    };
  }
  if (!Number.isFinite(oldLineAmount) || oldLineAmount < 0) {
    return { preview: null, error: "The original appointment amount is invalid. Please review the booking." };
  }

  const [{ sizes, error: sizeError }, { pricing, error: priceError }] = await Promise.all([
    fetchPetSizes(serviceType as ServiceType), fetchPackagesFull(serviceType as ServiceType),
  ]);
  if (sizeError || priceError) {
    return { preview: null, error: sizeError || priceError || "Unable to load grooming pricing." };
  }

  const activeSizes = sizes.filter((size) => size.is_active);
  const serviceSizes = isCat ? catGroomingSizeGuide(activeSizes) : activeSizes;
  if (isCat && (!serviceSizes.some((size) => size.label.trim().toLowerCase() === "small") ||
                !serviceSizes.some((size) => size.label.trim().toLowerCase() === "large"))) {
    return {
      preview: null,
      error: "Cat grooming needs active Small and Large sizes in Service Management before the price can be verified.",
    };
  }

  const matchedSize = matchPetSize(weightKg, serviceSizes);
  if (!matchedSize) {
    return {
      preview: null,
      error: isCat
        ? "The cat's weight could not be classified as Small (up to 5 kg) or Large (above 5 kg)."
        : "The measured weight does not match an active size bracket in Service Management.",
    };
  }

  const quotedRate = pricing.find((row) => row.id === oldPricingId && row.package_id === packageId);
  if (!quotedRate) {
    return {
      preview: null,
      error: "The original booked pricing row is no longer available. Please review the appointment and its package pricing; the quoted amount was not changed.",
    };
  }

  // Prefer the database size ID, then an exact size label. Do not quietly
  // substitute a generic row just for the preview: the database verification
  // function must find the same size-specific row before any charge is saved.
  const packageRates = pricing.filter((row) => row.package_id === packageId);
  const verifiedRate = packageRates.find((row) => row.size_id === matchedSize.id)
    ?? packageRates.find((row) => row.size_label.trim().toLowerCase() === matchedSize.label.trim().toLowerCase());

  if (!verifiedRate) {
    const hasLegacyStandard = packageRates.some((row) =>
      ["standard", "all sizes", "all size", "fixed", "any size"].includes(row.size_label.trim().toLowerCase()));
    return {
      preview: null,
      error: isCat && hasLegacyStandard
        ? `This cat package has a legacy Standard price but no ${matchedSize.label} price row. Apply the Cat Size Verification pricing migration, then calculate again. No price was changed.`
        : `This package has no configured price for the verified ${matchedSize.label} size. Ask an admin to review Service Management before confirming.`,
    };
  }

  const extraAmount = Math.round((oldLineAmount - quotedRate.price) * 100) / 100;
  if (!Number.isFinite(extraAmount) || extraAmount < -0.01) {
    return { preview: null, error: "The original line price is below its package rate. Please review its pricing manually." };
  }

  return {
    preview: {
      sizeId: matchedSize.id,
      sizeLabel: matchedSize.label,
      weightKg,
      previousLineAmount: oldLineAmount,
      newLineAmount: Math.round((verifiedRate.price + extraAmount) * 100) / 100,
      previousPackageAmount: quotedRate.price,
      newPackageAmount: verifiedRate.price,
    },
    error: null,
  };
}

export async function saveGroomingVerification(args: {
  appointmentPetId: string;
  weightKg: number;
  customerApproved: boolean;
  expectedPreviousLineAmount: number;
}) {
  // Keep the existing server-authoritative RPC. The UI's calculation never
  // writes a price; the database must revalidate weight, approved amount and
  // appointment state before committing any verification changes.
  const { data, error } = await createClient().rpc("happytails_verify_online_grooming_price", {
    p_appointment_pet_id: args.appointmentPetId,
    p_weight_kg: args.weightKg,
    p_customer_approved: args.customerApproved,
    p_expected_line_amount: args.expectedPreviousLineAmount,
  });
  return { result: data, error: error?.message ?? null };
}
