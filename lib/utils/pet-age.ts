/** A text age preserves the unit; legacy `pets.age` is years only. */
export type PetAge = { age?: number | null; age_text?: string | null };

export function normalizePetAge(input: string): { age: number | null; age_text: string | null } | null {
  const value = input.trim().replace(/\s+/g, " ").toLowerCase();
  if (!value) return { age: null, age_text: null };
  const match = /^(\d{1,4})\s*(weeks?|wks?|months?|mos?|years?|yrs?)?$/.exec(value);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2] ?? "years";
  const kind = /^(w|wk)/.test(unit) ? "week" : /^(m|mo)/.test(unit) ? "month" : "year";
  const maximum = kind === "year" ? 100 : kind === "month" ? 1200 : 5200;
  if (!Number.isSafeInteger(amount) || amount > maximum || (amount === 0 && kind !== "year")) return null;
  // Numeric age remains populated only for ages explicitly entered in years.
  return { age: kind === "year" ? amount : null,
    age_text: `${amount} ${kind}${amount === 1 ? "" : "s"}` };
}

export function petAgeLabel(pet: PetAge): string | null {
  if (pet.age_text?.trim()) return pet.age_text.trim();
  if (pet.age == null) return null;
  return `${pet.age} ${pet.age === 1 ? "year" : "years"}`;
}

/** HappyTails only accepts pets that are at least 3 months old. The same rule
 * is enforced in the database (supabase/migrations/20261117_07_pet_minimum_age.sql). */
export const MIN_PET_AGE_LABEL = "3 months";
export const MIN_PET_AGE_MESSAGE = "HappyTails accepts pets that are at least 3 months old (12 weeks).";

/** True when a normalized age is at least 3 months: 12+ weeks, 3+ months or 1+ years. */
export function meetsMinimumPetAge(ageText: string | null | undefined): boolean {
  const match = /^(\d+) (week|month|year)s?$/.exec((ageText ?? "").trim());
  if (!match) return false;
  const amount = Number(match[1]);
  return match[2] === "week" ? amount >= 12 : match[2] === "month" ? amount >= 3 : amount >= 1;
}

/** Validation message for a pet age input, or null when it is acceptable.
 * `required` is true when registering a new pet. */
export function petAgeError(input: string, required: boolean): string | null {
  const normalized = normalizePetAge(input);
  if (normalized === null) return "Use an age such as 12 weeks, 6 months, or 2 years.";
  if (!normalized.age_text) return required ? "Enter the pet's age. " + MIN_PET_AGE_MESSAGE : null;
  if (!meetsMinimumPetAge(normalized.age_text)) return `${MIN_PET_AGE_MESSAGE} You entered ${normalized.age_text}.`;
  return null;
}
