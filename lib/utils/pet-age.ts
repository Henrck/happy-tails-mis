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
