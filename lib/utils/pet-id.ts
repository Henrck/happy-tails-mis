/** Human-friendly Pet ID from pets.pet_number (assigned by the database,
 * starting at 1): 1 -> "PET-0001". Returns null if the pet has no number yet. */
export function formatPetId(petNumber: number | null | undefined): string | null {
  if (petNumber == null || !Number.isFinite(Number(petNumber))) return null;
  return `PET-${String(petNumber).padStart(4, "0")}`;
}

/** True when a search query matches the pet's ID ("PET-0012", "pet-12", "12", "#12"). */
export function matchesPetId(petNumber: number | null | undefined, query: string): boolean {
  if (petNumber == null) return false;
  const digits = query.trim().toLowerCase().replace(/^#/, "").replace(/^pet-?/, "");
  return /^\d+$/.test(digits) && Number(digits) === Number(petNumber);
}
