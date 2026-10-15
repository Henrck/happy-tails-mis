import { createClient } from "@/lib/supabase/client";
import { fetchPetSizes, fetchPackagesFull } from "@/lib/supabase/services";
import { matchPetSize } from "@/lib/utils/pet-size-guide";
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

export async function previewGroomingVerification(args: {
  serviceType: "dog_grooming" | "cat_grooming";
  packageId: string;
  oldPricingId: string;
  oldLineAmount: number;
  weightKg: number;
}): Promise<{ preview: VerificationPreview | null; error: string | null }> {
  const { serviceType, packageId, oldPricingId, oldLineAmount, weightKg } = args;
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 200) {
    return { preview: null, error: "Enter a valid measured weight (above 0 and up to 200 kg)." };
  }
  const [{ sizes, error: sizeError }, { pricing, error: priceError }] = await Promise.all([
    fetchPetSizes(serviceType as ServiceType), fetchPackagesFull(serviceType as ServiceType),
  ]);
  if (sizeError || priceError) return { preview: null, error: sizeError || priceError || "Unable to load pricing." };
  const match = matchPetSize(weightKg, sizes.filter((s) => s.is_active));
  if (!match) return { preview: null, error: "The measured weight does not match any active size bracket in Service Management." };
  const original = pricing.find((p) => p.id === oldPricingId && p.package_id === packageId);
  const replacement = pricing.find((p) => p.package_id === packageId && p.size_id === match.id)
    ?? pricing.find((p) => p.package_id === packageId && p.size_label.trim().toLowerCase() === match.label.trim().toLowerCase());
  if (!original || !replacement) return { preview: null, error: "The package is missing a pricing row for either the quoted or verified size." };
  const existingExtras = Math.round((oldLineAmount - original.price) * 100) / 100;
  if (existingExtras < -0.01) return { preview: null, error: "The original line price is below its package rate. Please review its pricing manually." };
  return { preview: {
    sizeId: match.id, sizeLabel: match.label, weightKg,
    previousLineAmount: oldLineAmount,
    newLineAmount: Math.round((replacement.price + existingExtras) * 100) / 100,
    previousPackageAmount: original.price, newPackageAmount: replacement.price,
  }, error: null };
}

export async function saveGroomingVerification(args: {
  appointmentPetId: string;
  weightKg: number;
  customerApproved: boolean;
  expectedPreviousLineAmount: number;
}) {
  const { data, error } = await createClient().rpc("happytails_verify_online_grooming_price", {
    p_appointment_pet_id: args.appointmentPetId,
    p_weight_kg: args.weightKg,
    p_customer_approved: args.customerApproved,
    p_expected_line_amount: args.expectedPreviousLineAmount,
  });
  return { result: data, error: error?.message ?? null };
}
